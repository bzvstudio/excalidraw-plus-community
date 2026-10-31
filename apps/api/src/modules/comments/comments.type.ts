import type { SceneAccess } from "../access/access.type.js";
import type { Membership } from "../authorization/authorization.type.js";
import type { SceneRef } from "../scenes/scenes.type.js";
import type { SceneGrant } from "../sharing/sharing.type.js";

export type CommentAnchor =
  | { x: number; y: number }
  | { x: number; y: number; elementId: string; offsetX: number; offsetY: number };

export type Commenter = {
  scene: SceneRef;
  access: Exclude<SceneAccess, "none">;
  via: "membership" | "link";
  author: { userId: string } | { guestId: string; name: string };
  isAdmin: boolean;
};

export type CommentAuthorship = {
  authorId: string | null;
  guestId: string | null;
};

export type CommentView = {
  id: string;
  authorName: string | null;
  authorAvatarId: string | null;
  isGuest: boolean;
  body: string;
  createdAt: Date;
  editedAt: Date | null;
  canEdit: boolean;
  canDelete: boolean;
};

export type ThreadView = {
  id: string;
  anchor: CommentAnchor;
  createdAt: Date;
  resolvedAt: Date | null;
  comments: CommentView[];
};

export type SceneComments = {
  threads: ThreadView[];
  canPost: boolean;
  canResolve: boolean;
};

export type CommentsChanged = (sceneId: string, threadId: string) => void;

export type CommentsService = {
  commenterForMember: (actor: Membership, sceneId: string) => Promise<Commenter>;
  commenterForGrant: (grant: SceneGrant) => Commenter;
  list: (commenter: Commenter) => Promise<SceneComments>;
  start: (commenter: Commenter, anchor: CommentAnchor, body: string) => Promise<{ threadId: string }>;
  reply: (commenter: Commenter, threadId: string, body: string) => Promise<void>;
  edit: (commenter: Commenter, commentId: string, body: string) => Promise<void>;
  remove: (commenter: Commenter, commentId: string) => Promise<void>;
  resolve: (commenter: Commenter, threadId: string, resolved: boolean) => Promise<void>;
  resealNext: (limit: number) => Promise<number>;
};
