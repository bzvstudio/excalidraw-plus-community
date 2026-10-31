import type { Membership } from "../authorization/authorization.type.js";

export type Team = {
  id: string;
  name: string;
  memberIds: string[];
};

export type TeamsService = {
  list: (actor: Membership) => Promise<Team[]>;
  create: (actor: Membership, name: string) => Promise<Team>;
  rename: (actor: Membership, teamId: string, name: string) => Promise<void>;
  delete: (actor: Membership, teamId: string) => Promise<void>;
  addMember: (actor: Membership, teamId: string, userId: string) => Promise<void>;
  removeMember: (actor: Membership, teamId: string, userId: string) => Promise<void>;
};
