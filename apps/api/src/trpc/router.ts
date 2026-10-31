import { router } from "./procedures.js";
import { aiRouter } from "./routers/ai.router.js";
import { apiKeysRouter } from "./routers/api-keys.router.js";
import { auditRouter } from "./routers/audit.router.js";
import { callsRouter } from "./routers/calls.router.js";
import { collectionsRouter } from "./routers/collections.router.js";
import { commentsRouter } from "./routers/comments.router.js";
import { configRouter } from "./routers/config.router.js";
import { invitesRouter } from "./routers/invites.router.js";
import { libraryRouter } from "./routers/library.router.js";
import { scenesRouter } from "./routers/scenes.router.js";
import { sessionRouter } from "./routers/session.router.js";
import { sharedRouter } from "./routers/shared.router.js";
import { sharesRouter } from "./routers/shares.router.js";
import { teamsRouter } from "./routers/teams.router.js";
import { workspacesRouter } from "./routers/workspaces.router.js";

export type { Principal, SignInOption, SignUpMode, SignUpRefusalCode } from "../modules/auth/auth.type.js";
export type { WorkspaceRole } from "../modules/authorization/authorization.type.js";
export type { InvitableRole, InvitePreview, WorkspaceSummary } from "../modules/workspaces/workspaces.type.js";
export type { SceneAppState, SceneElement } from "../modules/scenes/scenes.type.js";
export type {
  ClientEvents,
  CollabRefusal,
  JoinedRoom,
  JoinRequest,
  Person,
  Presence,
  Presentation,
  PresentPerson,
  RelayedPresence,
  RemoteChanges,
  SceneBounds,
  ServerEvents,
} from "../modules/collab/collab.type.js";
export type { CommentAnchor, SceneComments, ThreadView, CommentView } from "../modules/comments/comments.type.js";
export type { ShareRole } from "../modules/sharing/sharing.type.js";
export type { RuntimeConfig } from "../modules/system/system.type.js";
export type { AiOptions, WorkspaceAiProvider } from "../modules/ai/ai.type.js";
export type { ApiKeyScope } from "../modules/authorization/authorization.type.js";

export const appRouter = router({
  config: configRouter,
  comments: commentsRouter,
  session: sessionRouter,
  workspaces: workspacesRouter,
  invites: invitesRouter,
  scenes: scenesRouter,
  collections: collectionsRouter,
  teams: teamsRouter,
  library: libraryRouter,
  shares: sharesRouter,
  shared: sharedRouter,
  ai: aiRouter,
  calls: callsRouter,
  apiKeys: apiKeysRouter,
  audit: auditRouter,
});

export type AppRouter = typeof appRouter;
