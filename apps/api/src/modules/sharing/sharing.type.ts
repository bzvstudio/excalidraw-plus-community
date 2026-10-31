import type { Principal } from "../auth/auth.type.js";
import type { Membership } from "../authorization/authorization.type.js";

export type ShareRole = "view" | "edit";

export type Visitor = {
  guestId: string;
  name: string;
  links: string[];
};

export type SceneGrant = {
  linkId: string;
  sceneId: string;
  workspaceId: string;
  access: ShareRole;
  by: { guestId: string; name: string; userId: string | null };
};

export type ShareLink = {
  id: string;
  role: ShareRole;
  createdBy: string | null;
  createdAt: Date;
  expiresAt: Date | null;
};

export type OpenedLink = {
  visitor: Visitor;
  linkId: string;
  membership?: { workspaceSlug: string; sceneId: string };
};

export type SharingService = {
  create: (
    actor: Membership,
    sceneId: string,
    role: ShareRole,
    validForDays: number | null,
  ) => Promise<{ link: ShareLink; token: string }>;
  list: (actor: Membership, sceneId: string) => Promise<ShareLink[]>;
  revoke: (actor: Membership, sceneId: string, linkId: string) => Promise<void>;
  open: (token: string, visitor: Visitor | undefined, name: string | undefined, principal: Principal | null) => Promise<OpenedLink>;
  grantFor: (linkId: string, visitor: Visitor | undefined, principal: Principal | null) => Promise<SceneGrant>;
  grantForEmbed: (token: string) => Promise<SceneGrant>;
  cookie: { name: string; secure: boolean };
  readVisitor: (cookie: string | undefined) => Visitor | undefined;
  writeVisitor: (visitor: Visitor) => string;
};
