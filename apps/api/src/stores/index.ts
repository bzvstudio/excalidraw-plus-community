import { sql } from "drizzle-orm";
import type { DrizzleTransaction, Executor } from "./database.js";
import { collectionTeamsStore } from "./collection-teams.store.js";
import { commentThreadsStore } from "./comment-threads.store.js";
import { commentsStore } from "./comments.store.js";
import { aiUsageStore } from "./ai-usage.store.js";
import { apiKeysStore } from "./api-keys.store.js";
import { auditEventsStore } from "./audit-events.store.js";
import { collectionsStore } from "./collections.store.js";
import { instanceStore } from "./instance.store.js";
import { librariesStore } from "./libraries.store.js";
import { sceneFilesStore } from "./scene-files.store.js";
import { shareLinksStore } from "./share-links.store.js";
import { sceneThumbnailsStore } from "./scene-thumbnails.store.js";
import { teamMembersStore } from "./team-members.store.js";
import { teamsStore } from "./teams.store.js";
import { userAvatarsStore } from "./user-avatars.store.js";
import { workspaceAvatarsStore } from "./workspace-avatars.store.js";
import { scenesStore } from "./scenes.store.js";
import { workspaceAiKeysStore } from "./workspace-ai-keys.store.js";
import { workspaceInvitesStore } from "./workspace-invites.store.js";
import { workspaceMembersStore } from "./workspace-members.store.js";
import { workspaceRemovalsStore } from "./workspace-removals.store.js";
import { workspacesStore } from "./workspaces.store.js";

export const store = {
  instance: instanceStore,
  workspaces: workspacesStore,
  workspaceMembers: workspaceMembersStore,
  workspaceRemovals: workspaceRemovalsStore,
  workspaceInvites: workspaceInvitesStore,
  collections: collectionsStore,
  collectionTeams: collectionTeamsStore,
  teams: teamsStore,
  teamMembers: teamMembersStore,
  libraries: librariesStore,
  shareLinks: shareLinksStore,
  scenes: scenesStore,
  sceneFiles: sceneFilesStore,
  sceneThumbnails: sceneThumbnailsStore,
  commentThreads: commentThreadsStore,
  comments: commentsStore,
  aiUsage: aiUsageStore,
  apiKeys: apiKeysStore,
  auditEvents: auditEventsStore,
  workspaceAiKeys: workspaceAiKeysStore,
  userAvatars: userAvatarsStore,
  workspaceAvatars: workspaceAvatarsStore,

  ping: async (db: Executor = global.db): Promise<void> => {
    await db.execute(sql`select 1`);
  },

  transaction: <T>(run: (tx: DrizzleTransaction) => Promise<T>): Promise<T> =>
    global.db.transaction(run),
};
