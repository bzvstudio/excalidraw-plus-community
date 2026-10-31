import { randomUUID } from "node:crypto";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import { store } from "../../stores/index.js";
import type { AccessChanged, AccessibleScene, AccessService } from "../access/access.type.js";
import type { Principal } from "../auth/auth.type.js";
import type { Membership } from "../authorization/authorization.type.js";
import { DAY_MS, EMBED_VISITOR_NAME, GUEST_COOKIE, HOST_GUEST_COOKIE } from "./sharing.const.js";
import { assertCan, can } from "../authorization/authorization.utils.js";
import type { SharingService } from "./sharing.type.js";
import {
  effectiveRole,
  grantedAccess,
  GuestNameRequired,
  hashShareToken,
  linkProblem,
  newShareToken,
  signVisitor,
  toShareLink,
  UnknownShareLink,
  verifyVisitor,
  withLink,
} from "./sharing.utils.js";

export function createSharingService(options: {
  access: AccessService;
  accessChanged?: AccessChanged;
  secret: string;
  secureCookies: boolean;
  now?: () => Date;
}): SharingService {
  const { access, secret } = options;
  const accessChanged = options.accessChanged ?? (() => undefined);
  const now = options.now ?? (() => new Date());

  const membershipOf = async (scene: AccessibleScene & { workspaceId: string }, principal: Principal | null) => {
    const member = principal && (await store.workspaceMembers.get(scene.workspaceId, principal.userId));
    if (!principal || !member) return undefined;
    const actor = { workspaceId: scene.workspaceId, userId: principal.userId, role: member.role };
    return { canEdit: can(member.role, "scene.edit"), access: await access.sceneAccess(actor, scene) };
  };

  const liveLinkByToken = async (token: string) => {
    const row = await store.shareLinks.getWithSceneAndWorkspaceByTokenHash(hashShareToken(token));
    if (!row) throw new UnknownShareLink();
    const problem = linkProblem(row.link, now());
    if (problem) throw problem;
    return row;
  };

  const editableScene = async (actor: Membership, sceneId: string) => {
    assertCan(actor, "scene.edit");
    return access.requireScene(actor, await store.scenes.getByIdAndWorkspaceId(sceneId, actor.workspaceId), "edit");
  };

  return {
    create: async (actor, sceneId, role, validForDays) => {
      assertCan(actor, "scene.edit");
      const token = newShareToken();
      const createdAt = now();
      const row = await store.transaction(async (tx) => {
        const scene = await access.requireScene(
          actor,
          await store.scenes.getByIdAndWorkspaceIdForKeyShare(sceneId, actor.workspaceId, tx),
          "edit",
          tx,
        );
        const added = await store.shareLinks.add(
          {
            sceneId,
            role,
            tokenHash: hashShareToken(token),
            createdBy: actor.userId,
            createdAt,
            expiresAt: validForDays === null ? null : new Date(createdAt.getTime() + validForDays * DAY_MS),
          },
          tx,
        );
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "share_link.created",
            actor: auditActorOf(actor),
            target: { kind: "share_link", id: added.id, label: scene.title },
            metadata: { role, validForDays },
            at: createdAt,
          }),
          tx,
        );
        return added;
      });
      return { link: toShareLink(row), token };
    },

    list: async (actor, sceneId) => {
      await editableScene(actor, sceneId);
      return (await store.shareLinks.getAllActiveBySceneId(sceneId, now())).map(toShareLink);
    },

    revoke: async (actor, sceneId, linkId) => {
      const scene = await editableScene(actor, sceneId);
      const at = now();
      const outcome = await store.transaction(async (tx) => {
        const revoked = await store.shareLinks.updateRevokedByIdAndSceneIdIfActive(linkId, sceneId, at, tx);
        if (!revoked) {
          const found = await store.shareLinks.getWithSceneAndWorkspaceById(linkId, tx);
          return found?.link.sceneId === sceneId ? "already" : "unknown";
        }
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "share_link.revoked",
            actor: auditActorOf(actor),
            target: { kind: "share_link", id: linkId, label: scene.title },
            metadata: { role: revoked.role },
            at,
          }),
          tx,
        );
        return "revoked";
      });
      if (outcome === "unknown") throw new UnknownShareLink();
      if (outcome === "revoked") accessChanged({ sceneId });
    },

    open: async (token, visitor, name, principal) => {
      const row = await liveLinkByToken(token);
      const shownAs = name ?? principal?.name ?? visitor?.name;
      if (!shownAs) throw new GuestNameRequired();
      const opened = withLink(visitor ?? { guestId: randomUUID(), name: shownAs, links: [] }, row.link.id, shownAs);
      const member = await membershipOf(row.scene, principal);
      return member && member.access !== "none"
        ? { visitor: opened, linkId: row.link.id, membership: { workspaceSlug: row.workspace.slug, sceneId: row.scene.id } }
        : { visitor: opened, linkId: row.link.id };
    },

    grantFor: async (linkId, visitor, principal) => {
      if (!visitor?.links.includes(linkId)) throw new UnknownShareLink();
      const row = await store.shareLinks.getWithSceneAndWorkspaceById(linkId);
      if (!row) throw new UnknownShareLink();
      const problem = linkProblem(row.link, now());
      if (problem) throw problem;
      const member = await membershipOf(row.scene, principal);
      return {
        linkId,
        sceneId: row.scene.id,
        workspaceId: row.scene.workspaceId,
        access: grantedAccess(effectiveRole(row.link.role, row.workspace.guestEditLinks), member),
        by: { guestId: visitor.guestId, name: visitor.name, userId: member && principal ? principal.userId : null },
      };
    },

    grantForEmbed: async (token) => {
      const row = await liveLinkByToken(token);
      return {
        linkId: row.link.id,
        sceneId: row.scene.id,
        workspaceId: row.scene.workspaceId,
        access: "view",
        by: { guestId: row.link.id, name: EMBED_VISITOR_NAME, userId: null },
      };
    },

    cookie: options.secureCookies ? { name: HOST_GUEST_COOKIE, secure: true } : { name: GUEST_COOKIE, secure: false },

    readVisitor: (cookie) => verifyVisitor(cookie, secret),

    writeVisitor: (visitor) => signVisitor(visitor, secret),
  };
}
