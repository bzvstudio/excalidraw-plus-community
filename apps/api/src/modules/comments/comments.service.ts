import { randomUUID } from "node:crypto";
import { store } from "../../stores/index.js";
import type { DrizzleTransaction } from "../../stores/database.js";
import type { AccessService } from "../access/access.type.js";
import { assertCan, can } from "../authorization/authorization.utils.js";
import type { Sealer } from "../encryption/encryption.type.js";
import { UnknownScene } from "../scenes/scenes.utils.js";
import type { Commenter, CommentsChanged, CommentsService } from "./comments.type.js";
import {
  anchorColumns,
  anchorOf,
  canDelete,
  canEdit,
  canPost,
  canResolve,
  CommentDenied,
  commentSealContext,
  UnknownComment,
  UnknownThread,
} from "./comments.utils.js";

export function createCommentsService(options: {
  sealer: Sealer;
  access: AccessService;
  commentsChanged?: CommentsChanged;
  now?: () => Date;
  generateId?: () => string;
}): CommentsService {
  const { sealer, access } = options;
  const commentsChanged = options.commentsChanged ?? (() => undefined);
  const now = options.now ?? (() => new Date());
  const generateId = options.generateId ?? randomUUID;

  const sealBody = (threadId: string, commentId: string, body: string) => {
    const sealed = sealer.seal(Buffer.from(body, "utf8"), commentSealContext(threadId, commentId));
    return { body: sealed.bytes, bodyKeyId: sealed.keyId };
  };

  const authorColumns = (commenter: Commenter) =>
    "userId" in commenter.author
      ? { authorId: commenter.author.userId, guestId: null, guestName: null }
      : { authorId: null, guestId: commenter.author.guestId, guestName: commenter.author.name };

  const addComment = async (commenter: Commenter, threadId: string, body: string, tx: DrizzleTransaction) => {
    const id = generateId();
    await store.comments.add({ id, threadId, ...authorColumns(commenter), ...sealBody(threadId, id, body), createdAt: now() }, tx);
  };

  const ownComment = async (commenter: Commenter, commentId: string, tx: DrizzleTransaction) => {
    const row = await store.comments.getWithThreadByIdAndSceneIdForUpdate(commentId, commenter.scene.sceneId, tx);
    if (!row) throw new UnknownComment();
    return row;
  };

  return {
    commenterForMember: async (actor, sceneId) => {
      assertCan(actor, "scene.view");
      const sceneAccess = await access.sceneAccessById(actor, sceneId);
      if (sceneAccess === "none") throw new UnknownScene();
      return {
        scene: { workspaceId: actor.workspaceId, sceneId },
        access: sceneAccess,
        via: "membership",
        author: { userId: actor.userId },
        isAdmin: can(actor.role, "workspace.manage"),
      };
    },

    commenterForGrant: (grant) => ({
      scene: { workspaceId: grant.workspaceId, sceneId: grant.sceneId },
      access: grant.access,
      via: "link",
      author: grant.by.userId ? { userId: grant.by.userId } : { guestId: grant.by.guestId, name: grant.by.name },
      isAdmin: false,
    }),

    list: async (commenter) => {
      const [threads, comments] = await Promise.all([
        store.commentThreads.getAllBySceneId(commenter.scene.sceneId),
        store.comments.getAllWithUsersBySceneId(commenter.scene.sceneId),
      ]);
      const byThread = new Map<string, typeof comments>();
      for (const row of comments) byThread.set(row.comment.threadId, [...(byThread.get(row.comment.threadId) ?? []), row]);
      return {
        canPost: canPost(commenter),
        canResolve: canResolve(commenter),
        threads: threads
          .map((thread) => ({
            id: thread.id,
            anchor: anchorOf(thread),
            createdAt: thread.createdAt,
            resolvedAt: thread.resolvedAt,
            comments: (byThread.get(thread.id) ?? []).map(({ comment, authorName, authorAvatarId }) => ({
                id: comment.id,
                authorName: comment.guestName ?? authorName,
                authorAvatarId,
                isGuest: comment.guestId !== null,
                body: sealer.open(comment.body, commentSealContext(comment.threadId, comment.id)).toString("utf8"),
                createdAt: comment.createdAt,
                editedAt: comment.editedAt,
                canEdit: canEdit(commenter, comment),
                canDelete: canDelete(commenter, comment),
              })),
          }))
          .sort((a, b) => Number(a.resolvedAt !== null) - Number(b.resolvedAt !== null)),
      };
    },

    start: async (commenter, anchor, body) => {
      if (!canPost(commenter)) throw new CommentDenied("comment on this scene");
      const started = await store.transaction(async (tx) => {
        if (!(await store.scenes.getForKeyShare(commenter.scene.sceneId, tx))) throw new UnknownScene();
        const thread = await store.commentThreads.add(
          { sceneId: commenter.scene.sceneId, ...anchorColumns(anchor), createdAt: now() },
          tx,
        );
        await addComment(commenter, thread.id, body, tx);
        return { threadId: thread.id };
      });
      commentsChanged(commenter.scene.sceneId, started.threadId);
      return started;
    },

    reply: async (commenter, threadId, body) => {
      if (!canPost(commenter)) throw new CommentDenied("comment on this scene");
      await store.transaction(async (tx) => {
        if (!(await store.commentThreads.getByIdAndSceneIdForUpdate(threadId, commenter.scene.sceneId, tx))) {
          throw new UnknownThread();
        }
        await addComment(commenter, threadId, body, tx);
      });
      commentsChanged(commenter.scene.sceneId, threadId);
    },

    edit: async (commenter, commentId, body) => {
      const threadId = await store.transaction(async (tx) => {
        const { comment } = await ownComment(commenter, commentId, tx);
        if (!canEdit(commenter, comment)) throw new CommentDenied("edit someone else's comment");
        await store.comments.update(commentId, { ...sealBody(comment.threadId, commentId, body), editedAt: now() }, tx);
        return comment.threadId;
      });
      commentsChanged(commenter.scene.sceneId, threadId);
    },

    remove: async (commenter, commentId) => {
      const threadId = await store.transaction(async (tx) => {
        const { comment, thread } = await ownComment(commenter, commentId, tx);
        if (!canDelete(commenter, comment)) throw new CommentDenied("delete someone else's comment");
        await store.comments.delete(commentId, tx);
        if (!(await store.comments.getByThreadId(thread.id, tx))) await store.commentThreads.delete(thread.id, tx);
        return thread.id;
      });
      commentsChanged(commenter.scene.sceneId, threadId);
    },

    resolve: async (commenter, threadId, resolved) => {
      if (!canResolve(commenter)) throw new CommentDenied("resolve threads on this scene");
      const row = await store.commentThreads.updateByIdAndSceneId(threadId, commenter.scene.sceneId, {
        resolvedAt: resolved ? now() : null,
      });
      if (!row) throw new UnknownThread();
      commentsChanged(commenter.scene.sceneId, threadId);
    },

    resealNext: async (limit) => {
      const ids = await store.comments.getAllIdsNotSealedWith(sealer.currentKeyId, limit);
      for (const { id } of ids) {
        await store.transaction(async (tx) => {
          const row = await store.comments.getForUpdate(id, tx);
          if (!row || row.bodyKeyId === sealer.currentKeyId) return;
          const context = commentSealContext(row.threadId, id);
          const resealed = sealer.seal(sealer.open(row.body, context), context);
          await store.comments.update(id, { body: resealed.bytes, bodyKeyId: resealed.keyId }, tx);
        });
      }
      return ids.length;
    },
  };
}
