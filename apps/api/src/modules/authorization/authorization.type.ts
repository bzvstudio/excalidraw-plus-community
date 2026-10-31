export type WorkspaceRole = "admin" | "member" | "viewer";

export type Capability =
  | "workspace.view"
  | "workspace.manage"
  | "scene.create"
  | "scene.edit"
  | "scene.view"
  | "collection.manage";

export type Membership = {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
};

export type ApiKeyScope = "read" | "write";

export type ApiKeyActor = {
  workspaceId: string;
  keyId: string;
  scope: ApiKeyScope;
};

export type Actor = Membership | ApiKeyActor;
