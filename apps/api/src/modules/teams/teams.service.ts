import { store } from "../../stores/index.js";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import type { AccessChanged } from "../access/access.type.js";
import { assertCan } from "../authorization/authorization.utils.js";
import { isUniqueViolation, UnknownMember } from "../workspaces/workspaces.utils.js";
import type { TeamsService } from "./teams.type.js";
import { TeamInUse, TeamNameTaken, UnknownTeam } from "./teams.utils.js";

export function createTeamsService(options: { accessChanged?: AccessChanged; now?: () => Date } = {}): TeamsService {
  const accessChanged = options.accessChanged ?? (() => undefined);
  const now = options.now ?? (() => new Date());

  const named = async <T>(name: string, write: () => Promise<T>): Promise<T> => {
    try {
      return await write();
    } catch (error) {
      if (isUniqueViolation(error)) throw new TeamNameTaken(name);
      throw error;
    }
  };

  return {
    list: async (actor) => {
      assertCan(actor, "workspace.view");
      const [teams, members] = await Promise.all([
        store.teams.getAllByWorkspaceId(actor.workspaceId),
        store.teamMembers.getAllByWorkspaceId(actor.workspaceId),
      ]);
      return teams.map((team) => ({
        id: team.id,
        name: team.name,
        memberIds: members.filter(({ teamId }) => teamId === team.id).map(({ userId }) => userId),
      }));
    },

    create: async (actor, name) => {
      assertCan(actor, "workspace.manage");
      const row = await named(name, () => store.teams.add({ workspaceId: actor.workspaceId, name, createdAt: now() }));
      return { id: row.id, name: row.name, memberIds: [] };
    },

    rename: async (actor, teamId, name) => {
      assertCan(actor, "workspace.manage");
      const row = await named(name, () => store.teams.updateByIdAndWorkspaceId(teamId, actor.workspaceId, { name }));
      if (!row) throw new UnknownTeam();
    },

    delete: async (actor, teamId) => {
      assertCan(actor, "workspace.manage");
      await store.transaction(async (tx) => {
        if (!(await store.teams.getByIdAndWorkspaceIdForUpdate(teamId, actor.workspaceId, tx))) throw new UnknownTeam();
        if (await store.collectionTeams.getByTeamId(teamId, tx)) throw new TeamInUse();
        await store.teams.deleteByIdAndWorkspaceId(teamId, actor.workspaceId, tx);
      });
    },

    addMember: async (actor, teamId, userId) => {
      assertCan(actor, "workspace.manage");
      await store.transaction(async (tx) => {
        const [team] = await store.teams.getAllByIdsAndWorkspaceIdForKeyShare([teamId], actor.workspaceId, tx);
        if (!team) throw new UnknownTeam();
        if (!(await store.workspaceMembers.getForUpdate(actor.workspaceId, userId, tx))) throw new UnknownMember();
        if (!(await store.teamMembers.addIfAbsent({ teamId, userId }, tx))) return;
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "team.member_added",
            actor: auditActorOf(actor),
            target: { kind: "user", id: userId },
            metadata: { teamId, teamName: team.name },
            at: now(),
          }),
          tx,
        );
      });
    },

    removeMember: async (actor, teamId, userId) => {
      assertCan(actor, "workspace.manage");
      const removed = await store.transaction(async (tx) => {
        const team = await store.teams.getByIdAndWorkspaceId(teamId, actor.workspaceId, tx);
        if (!team) throw new UnknownTeam();
        if (!(await store.teamMembers.delete(teamId, userId, tx))) return false;
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "team.member_removed",
            actor: auditActorOf(actor),
            target: { kind: "user", id: userId },
            metadata: { teamId, teamName: team.name },
            at: now(),
          }),
          tx,
        );
        return true;
      });
      if (removed) accessChanged({ workspaceId: actor.workspaceId });
    },
  };
}
