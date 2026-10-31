import type { Actor, Membership } from "../authorization/authorization.type.js";

export type Collection = {
  id: string;
  name: string;
  createdBy: string | null;
  createdAt: Date;
  teamIds: string[];
};

export type CollectionsService = {
  list: (actor: Actor) => Promise<Collection[]>;
  create: (actor: Membership, name: string) => Promise<Collection>;
  rename: (actor: Membership, collectionId: string, name: string) => Promise<Collection>;
  delete: (actor: Membership, collectionId: string) => Promise<void>;
  restrict: (actor: Membership, collectionId: string, teamIds: string[]) => Promise<Collection>;
};
