import { createHash, randomBytes } from "node:crypto";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import type { DrizzleTransaction } from "../../stores/database.js";
import { store } from "../../stores/index.js";
import type { AccessChanged } from "../access/access.type.js";
import { UnknownApiKey } from "../api-keys/api-keys.utils.js";
import { assertCan, WorkspaceAccessDenied } from "../authorization/authorization.utils.js";
import type { EmailService } from "../email/email.type.js";
import { fragmentLink, invitationEmail } from "../email/email.utils.js";
import { DAY_MS, HOUR_MS, INVITE_DEFAULT_MAX_USES, INVITE_EMAILS_PER_HOUR, INVITE_PATH, INVITE_TOKEN_BYTES } from "./workspaces.const.js";
import type { Membership, WorkspaceRole } from "../authorization/authorization.type.js";
import type { InvitableRole, InviteMaxUses, InviteRevokeReason, InviteValidityDays, WorkspacesService } from "./workspaces.type.js";
import {
  EmailUnavailable,
  InviteNoLongerUsable,
  inviteProblem,
  toWorkspaceListItem,
  isRefusedInvite,
  isUniqueViolation,
  LastAdministrator,
  recentWithin,
  RemovedFromWorkspace,
  HandleTaken,
  slugCandidates,
  TooManyInviteEmails,
  toWorkspaceInvite,
  toWorkspaceSummary,
  UnknownInvite,
  UnknownMember,
  UnknownRemoval,
  UnknownWorkspace,
} from "./workspaces.utils.js";

function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type WorkspacesServiceOptions = {
  email: EmailService;
  publicBaseUrl: string;
  productName: string;
  accessChanged?: AccessChanged;
  now?: () => Date;
  generateToken?: () => string;
};

export function createWorkspacesService(options: WorkspacesServiceOptions): WorkspacesService {
  const { email, publicBaseUrl, productName } = options;
  const accessChanged = options.accessChanged ?? (() => undefined);
  const invitesEmailedBy = new Map<string, number[]>();
  const now = options.now ?? (() => new Date());
  const generateToken = options.generateToken ?? (() => randomBytes(INVITE_TOKEN_BYTES).toString("base64url"));

  const usableInvite = async (token: string) => {
    const found = await store.workspaceInvites.getWithWorkspaceByTokenHash(hashInviteToken(token));
    if (!found) throw new UnknownInvite();
    const problem = inviteProblem(found.invite, now());
    if (problem) throw new InviteNoLongerUsable(problem);
    return found;
  };

  const createInvite = async (
    actor: Membership,
    role: InvitableRole,
    validForDays: InviteValidityDays,
    maxUses: InviteMaxUses | null = INVITE_DEFAULT_MAX_USES,
    emailed = false,
  ) => {
    assertCan(actor, "workspace.manage");
    const token = generateToken();
    const createdAt = now();
    const expiresAt = new Date(createdAt.getTime() + validForDays * DAY_MS);
    const invite = await store.transaction(async (tx) => {
      const added = await store.workspaceInvites.add(
        {
          workspaceId: actor.workspaceId,
          role,
          tokenHash: hashInviteToken(token),
          createdBy: actor.userId,
          expiresAt,
          maxUses,
          createdAt,
        },
        tx,
      );
      await store.auditEvents.add(
        auditEvent({
          workspaceId: actor.workspaceId,
          action: "member.invited",
          actor: auditActorOf(actor),
          target: { kind: "invite", id: added.id },
          metadata: { role, validForDays, maxUses, emailed },
          at: createdAt,
        }),
        tx,
      );
      return added;
    });
    return { invite: toWorkspaceInvite(invite), token };
  };

  const revokeInviteOf = async (actor: Membership, inviteId: string, reason: InviteRevokeReason) => {
    const at = now();
    await store.transaction(async (tx) => {
      const row = await store.workspaceInvites.updateRevokedByIdAndWorkspaceIdIfActive(inviteId, actor.workspaceId, at, tx);
      if (!row) {
        if (!(await store.workspaceInvites.getByIdAndWorkspaceId(inviteId, actor.workspaceId, tx))) throw new UnknownInvite();
        return;
      }
      await store.auditEvents.add(
        auditEvent({
          workspaceId: actor.workspaceId,
          action: "invite.revoked",
          actor: auditActorOf(actor),
          target: { kind: "invite", id: inviteId },
          metadata: { role: row.role, reason },
          at,
        }),
        tx,
      );
    });
  };

  const revokeKeysIn = async (actor: Membership, keyIds: readonly string[], tx: DrizzleTransaction) => {
    const at = now();
    for (const keyId of keyIds) {
      const revoked = await store.apiKeys.updateRevokedByIdAndWorkspaceIdIfActive(keyId, actor.workspaceId, at, tx);
      if (!revoked) {
        if (!(await store.apiKeys.getByIdAndWorkspaceId(keyId, actor.workspaceId, tx))) throw new UnknownApiKey();
        continue;
      }
      await store.auditEvents.add(
        auditEvent({
          workspaceId: actor.workspaceId,
          action: "api_key.revoked",
          actor: auditActorOf(actor),
          target: { kind: "api_key", id: keyId, label: revoked.name },
          at,
        }),
        tx,
      );
    }
  };

  const lockForMembershipChange = async (actor: Membership, userId: string, tx: DrizzleTransaction) => {
    const admins = await store.workspaceMembers.getAllAdminsForUpdate(actor.workspaceId, tx);
    if (!admins.some((admin) => admin.userId === actor.userId)) throw new WorkspaceAccessDenied("workspace.manage");
    const target = await store.workspaceMembers.getForUpdate(actor.workspaceId, userId, tx);
    if (!target) throw new UnknownMember();
    return { isLastAdmin: target.role === "admin" && admins.length === 1, role: target.role };
  };

  return {
    listForUser: async (userId) => {
      const rows = await store.workspaceMembers.getAllWithWorkspacesByUserId(userId);
      const counts = new Map(
        (await store.workspaceMembers.getAllMemberCountsByWorkspaceIds(rows.map(({ workspace }) => workspace.id))).map(
          ({ workspaceId, members }) => [workspaceId, members],
        ),
      );
      return rows.map(({ workspace, role, avatarId }) => toWorkspaceListItem(workspace, role, avatarId, counts.get(workspace.id) ?? 0));
    },

    membership: async (userId, workspaceId) => {
      const member = await store.workspaceMembers.get(workspaceId, userId);
      if (!member) throw new UnknownWorkspace();
      return { workspaceId, userId, role: member.role };
    },

    slugOf: async (workspaceId) => {
      const workspace = await store.workspaces.get(workspaceId);
      if (!workspace) throw new UnknownWorkspace();
      return workspace.slug;
    },

    getBySlug: async (userId, slug) => {
      const workspace = await store.workspaces.getBySlug(slug);
      const member = workspace && (await store.workspaceMembers.get(workspace.id, userId));
      if (!workspace || !member) throw new UnknownWorkspace();
      return toWorkspaceSummary(workspace, member.role, await store.workspaceAvatars.getIdByWorkspaceId(workspace.id));
    },

    create: async (userId, name, handle) => {
      const addWithAdmin = (slug: string) =>
        store.transaction(async (tx) => {
          const workspace = await store.workspaces.add({ name, slug }, tx);
          await store.workspaceMembers.addIfAbsent({ workspaceId: workspace.id, userId, role: "admin" }, tx);
          return toWorkspaceSummary(workspace, "admin", null);
        });

      if (handle !== undefined) {
        if (await store.workspaces.getBySlug(handle)) throw new HandleTaken();
        try {
          return await addWithAdmin(handle);
        } catch (error) {
          throw isUniqueViolation(error) ? new HandleTaken() : error;
        }
      }

      for (const slug of slugCandidates(name)) {
        if (await store.workspaces.getBySlug(slug)) continue;
        try {
          return await addWithAdmin(slug);
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
        }
      }
      throw new Error(`Could not find a free address for the workspace "${name}"`);
    },

    listMembers: async (actor) => {
      assertCan(actor, "workspace.view");
      return store.workspaceMembers.getAllWithUsersByWorkspaceId(actor.workspaceId);
    },

    changeRole: async (actor, userId, role, revokeKeyIds = []) => {
      assertCan(actor, "workspace.manage");
      await store.transaction(async (tx) => {
        const { isLastAdmin, role: from } = await lockForMembershipChange(actor, userId, tx);
        if (isLastAdmin && role !== "admin") throw new LastAdministrator();
        if (from === role) return;
        await revokeKeysIn(actor, revokeKeyIds, tx);
        await store.workspaceMembers.update(actor.workspaceId, userId, { role }, tx);
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "member.role_changed",
            actor: auditActorOf(actor),
            target: { kind: "user", id: userId },
            metadata: { from, to: role },
            at: now(),
          }),
          tx,
        );
      });
      accessChanged({ workspaceId: actor.workspaceId });
    },

    removeMember: async (actor, userId, revokeKeyIds = []) => {
      assertCan(actor, "workspace.manage");
      await store.transaction(async (tx) => {
        const { isLastAdmin, role } = await lockForMembershipChange(actor, userId, tx);
        if (isLastAdmin) throw new LastAdministrator();
        await revokeKeysIn(actor, revokeKeyIds, tx);
        await store.teamMembers.deleteByUserIdAndWorkspaceId(userId, actor.workspaceId, tx);
        await store.workspaceMembers.delete(actor.workspaceId, userId, tx);
        await store.workspaceRemovals.upsert({ workspaceId: actor.workspaceId, userId, removedAt: now() }, tx);
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "member.removed",
            actor: auditActorOf(actor),
            target: { kind: "user", id: userId },
            metadata: { role },
            at: now(),
          }),
          tx,
        );
      });
      accessChanged({ workspaceId: actor.workspaceId });
    },

    listRemoved: async (actor) => {
      assertCan(actor, "workspace.manage");
      return store.workspaceRemovals.getAllWithUsersByWorkspaceId(actor.workspaceId);
    },

    readmit: async (actor, userId) => {
      assertCan(actor, "workspace.manage");
      await store.transaction(async (tx) => {
        if (!(await store.workspaceRemovals.delete(actor.workspaceId, userId, tx))) throw new UnknownRemoval();
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "member.readmitted",
            actor: auditActorOf(actor),
            target: { kind: "user", id: userId },
            metadata: {},
            at: now(),
          }),
          tx,
        );
      });
    },

    createInvite,

    emailInvite: async (actor, { to, inviterName, role, validForDays }) => {
      assertCan(actor, "workspace.manage");
      if (!email.enabled) throw new EmailUnavailable();
      const sentAt = now().getTime();
      const recent = recentWithin(invitesEmailedBy.get(actor.userId) ?? [], sentAt, HOUR_MS);
      if (recent.length >= INVITE_EMAILS_PER_HOUR) throw new TooManyInviteEmails();
      invitesEmailedBy.set(actor.userId, [...recent, sentAt]);

      const workspace = await store.workspaces.get(actor.workspaceId);
      if (!workspace) throw new UnknownWorkspace();
      const { invite, token } = await createInvite(actor, role, validForDays, INVITE_DEFAULT_MAX_USES, true);
      try {
        await email.send(
          invitationEmail({
            to,
            productName,
            workspaceName: workspace.name,
            role,
            inviterName,
            link: fragmentLink(publicBaseUrl, INVITE_PATH, token),
            validForDays,
          }),
        );
      } catch (error) {
        await revokeInviteOf(actor, invite.id, "email_failed");
        throw error;
      }
      return invite;
    },

    listInvites: async (actor) => {
      assertCan(actor, "workspace.manage");
      return (await store.workspaceInvites.getAllActiveByWorkspaceId(actor.workspaceId, now())).map(toWorkspaceInvite);
    },

    revokeInvite: async (actor, inviteId) => {
      assertCan(actor, "workspace.manage");
      await revokeInviteOf(actor, inviteId, "revoked");
    },

    previewInvite: async (token) => {
      const { invite, workspace } = await usableInvite(token);
      return { workspaceName: workspace.name, role: invite.role };
    },

    isInviteUsable: async (token) => {
      try {
        await usableInvite(token);
        return true;
      } catch (error) {
        if (isRefusedInvite(error)) return false;
        throw error;
      }
    },

    acceptInvite: async (userId, token) =>
      store.transaction(async (tx) => {
        const found = await store.workspaceInvites.getWithWorkspaceByTokenHashForUpdate(hashInviteToken(token), tx);
        if (!found) throw new UnknownInvite();
        const { invite, workspace } = found;
        const already = await store.workspaceMembers.get(workspace.id, userId, tx);
        const summary = async (role: WorkspaceRole) =>
          toWorkspaceSummary(workspace, role, await store.workspaceAvatars.getIdByWorkspaceId(workspace.id, tx));
        if (already) return summary(already.role);
        const problem = inviteProblem(invite, now());
        if (problem) throw new InviteNoLongerUsable(problem);
        if (await store.workspaceRemovals.get(workspace.id, userId, tx)) throw new RemovedFromWorkspace();
        const joined = await store.workspaceMembers.addIfAbsent({ workspaceId: workspace.id, userId, role: invite.role }, tx);
        if (joined) {
          await store.workspaceInvites.incrementUsesById(invite.id, tx);
          await store.auditEvents.add(
            auditEvent({
              workspaceId: workspace.id,
              action: "member.joined",
              actor: { kind: "user", userId },
              target: { kind: "invite", id: invite.id },
              metadata: { role: invite.role },
              at: now(),
            }),
            tx,
          );
        }
        const member = await store.workspaceMembers.get(workspace.id, userId, tx);
        return summary(member?.role ?? invite.role);
      }),

    updateSettings: async (actor, settings) => {
      assertCan(actor, "workspace.manage");
      const changed = await store.transaction(async (tx) => {
        const workspace = await store.workspaces.getForUpdate(actor.workspaceId, tx);
        if (!workspace) throw new UnknownWorkspace();
        if (workspace.guestEditLinks === settings.guestEditLinks) return false;
        await store.workspaces.update(actor.workspaceId, settings, tx);
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "workspace.settings_changed",
            actor: auditActorOf(actor),
            metadata: { guestEditLinks: settings.guestEditLinks },
            at: now(),
          }),
          tx,
        );
        return true;
      });
      if (changed) accessChanged({ workspaceId: actor.workspaceId });
    },
  };
}
