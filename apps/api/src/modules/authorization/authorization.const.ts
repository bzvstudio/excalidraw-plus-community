import type { ApiKeyScope, Capability, WorkspaceRole } from "./authorization.type.js";

export const WORKSPACE_ROLES = ["admin", "member", "viewer"] as const satisfies readonly WorkspaceRole[];

export const INVITABLE_ROLES = ["member", "viewer"] as const satisfies readonly WorkspaceRole[];

export const ROLE_CAPABILITIES: Record<WorkspaceRole, readonly Capability[]> = {
  admin: ["workspace.view", "workspace.manage", "scene.create", "scene.edit", "scene.view", "collection.manage"],
  member: ["workspace.view", "scene.create", "scene.edit", "scene.view", "collection.manage"],
  viewer: ["workspace.view", "scene.view"],
};

export const API_KEY_SCOPES = ["read", "write"] as const satisfies readonly ApiKeyScope[];

export const API_KEY_CAPABILITIES: Record<ApiKeyScope, readonly Capability[]> = {
  read: ["workspace.view", "scene.view"],
  write: ["workspace.view", "scene.view", "scene.create", "scene.edit"],
};
