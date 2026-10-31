import type { INVITE_MAX_USES } from "./workspaces.const.js";
import type { Membership, WorkspaceRole } from "../authorization/authorization.type.js";

export type InviteValidityDays = 1 | 7 | 30;

export type InvitableRole = Exclude<WorkspaceRole, "admin">;

export type InviteMaxUses = (typeof INVITE_MAX_USES)[number];

export type InviteProblem = "expired" | "revoked" | "used";

export type InviteRevokeReason = "revoked" | "email_failed";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  guestEditLinks: boolean;
  avatarId: string | null;
};

export type WorkspaceListItem = WorkspaceSummary & { createdAt: Date; memberCount: number };

export type WorkspaceMember = {
  userId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: Date;
  avatarId: string | null;
};

export type RemovedMember = {
  userId: string;
  name: string;
  email: string;
  removedAt: Date;
};

export type WorkspaceInvite = {
  id: string;
  role: InvitableRole;
  maxUses: InviteMaxUses | null;
  uses: number;
  expiresAt: Date;
  createdAt: Date;
};

export type CreatedInvite = {
  invite: WorkspaceInvite;
  token: string;
};

export type InvitePreview = {
  workspaceName: string;
  role: InvitableRole;
};

export type WorkspacesService = {
  listForUser: (userId: string) => Promise<WorkspaceListItem[]>;
  membership: (userId: string, workspaceId: string) => Promise<Membership>;
  getBySlug: (userId: string, slug: string) => Promise<WorkspaceSummary>;
  slugOf: (workspaceId: string) => Promise<string>;
  create: (userId: string, name: string, handle?: string) => Promise<WorkspaceSummary>;
  listMembers: (actor: Membership) => Promise<WorkspaceMember[]>;
  changeRole: (actor: Membership, userId: string, role: WorkspaceRole, revokeKeyIds?: readonly string[]) => Promise<void>;
  removeMember: (actor: Membership, userId: string, revokeKeyIds?: readonly string[]) => Promise<void>;
  listRemoved: (actor: Membership) => Promise<RemovedMember[]>;
  readmit: (actor: Membership, userId: string) => Promise<void>;
  createInvite: (
    actor: Membership,
    role: InvitableRole,
    validForDays: InviteValidityDays,
    maxUses?: InviteMaxUses | null,
  ) => Promise<CreatedInvite>;
  listInvites: (actor: Membership) => Promise<WorkspaceInvite[]>;
  emailInvite: (
    actor: Membership,
    invitation: { to: string; inviterName: string; role: InvitableRole; validForDays: InviteValidityDays },
  ) => Promise<WorkspaceInvite>;
  revokeInvite: (actor: Membership, inviteId: string) => Promise<void>;
  previewInvite: (token: string) => Promise<InvitePreview>;
  isInviteUsable: (token: string) => Promise<boolean>;
  acceptInvite: (userId: string, token: string) => Promise<WorkspaceSummary>;
  updateSettings: (actor: Membership, settings: { guestEditLinks: boolean }) => Promise<void>;
};
