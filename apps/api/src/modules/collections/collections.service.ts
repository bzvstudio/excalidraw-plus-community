import { store } from "../../stores/index.js";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import type { AccessChanged, AccessService } from "../access/access.type.js";
import { assertCan } from "../authorization/authorization.utils.js";
import { UnknownTeam } from "../teams/teams.utils.js";
import type { CollectionsService } from "./collections.type.js";
import { CollectionNotEmpty, toCollection, UnknownCollection } from "./collections.utils.js";

export function createCollectionsService(options: {
  access: AccessService;
  accessChanged?: AccessChanged;
  now?: () => Date;
}): CollectionsService {
  const { access } = options;
  const accessChanged = options.accessChanged ?? (() => undefined);
  const now = options.now ?? (() => new Date());

  return {
    list: async (actor) => {
      assertCan(actor, "scene.view");
      const [rows, restrictions] = await Promise.all([
        store.collections.getAllByWorkspaceIdVisibleTo(actor.workspaceId, await access.viewerFor(actor)),
        store.collectionTeams.getAllByWorkspaceId(actor.workspaceId),
      ]);
      return rows.map((row) =>
        toCollection(
          row,
          restrictions.filter(({ collectionId }) => collectionId === row.id).map(({ teamId }) => teamId),
        ),
      );
    },

    create: async (actor, name) => {
      assertCan(actor, "collection.manage");
      const row = await store.collections.add({
        workspaceId: actor.workspaceId,
        name,
        createdBy: actor.userId,
        createdAt: now(),
      });
      return toCollection(row, []);
    },

    rename: async (actor, collectionId, name) => {
      assertCan(actor, "collection.manage");
      return store.transaction(async (tx) => {
        await access.requireCollection(
          actor,
          await store.collections.getByIdAndWorkspaceIdForUpdate(collectionId, actor.workspaceId, tx),
          tx,
        );
        const row = await store.collections.updateByIdAndWorkspaceId(collectionId, actor.workspaceId, { name }, tx);
        if (!row) throw new UnknownCollection();
        const restrictions = await store.collectionTeams.getAllTeamIdsByCollectionId(collectionId, tx);
        return toCollection(row, restrictions.map(({ teamId }) => teamId));
      });
    },

    delete: async (actor, collectionId) => {
      assertCan(actor, "collection.manage");
      await store.transaction(async (tx) => {
        await access.requireCollection(
          actor,
          await store.collections.getByIdAndWorkspaceIdForUpdate(collectionId, actor.workspaceId, tx),
          tx,
        );
        if (await store.scenes.getByCollectionId(collectionId, tx)) throw new CollectionNotEmpty();
        await store.collections.deleteByIdAndWorkspaceId(collectionId, actor.workspaceId, tx);
      });
    },

    restrict: async (actor, collectionId, teamIds) => {
      assertCan(actor, "workspace.manage");
      const { collection, changed } = await store.transaction(async (tx) => {
        const row = await access.requireCollection(
          actor,
          await store.collections.getByIdAndWorkspaceIdForUpdate(collectionId, actor.workspaceId, tx),
          tx,
        );
        const unique = [...new Set(teamIds)];
        const teams = unique.length
          ? await store.teams.getAllByIdsAndWorkspaceIdForKeyShare(unique, actor.workspaceId, tx)
          : [];
        if (teams.length !== unique.length) throw new UnknownTeam();
        const current = await store.collectionTeams.getAllTeamIdsByCollectionId(collectionId, tx);
        const same = current.length === unique.length && current.every(({ teamId }) => unique.includes(teamId));
        if (same) return { collection: toCollection(row, unique), changed: false };
        await store.collectionTeams.deleteByCollectionId(collectionId, tx);
        if (unique.length) await store.collectionTeams.add(unique.map((teamId) => ({ collectionId, teamId })), tx);
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "collection.access_changed",
            actor: auditActorOf(actor),
            target: { kind: "collection", id: collectionId, label: row.name },
            metadata: { teamIds: unique },
            at: now(),
          }),
          tx,
        );
        return { collection: toCollection(row, unique), changed: true };
      });
      if (changed) accessChanged({ workspaceId: actor.workspaceId });
      return collection;
    },
  };
}
