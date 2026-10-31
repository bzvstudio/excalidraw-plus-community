import type { CollectionRow } from "@repo/db";
import type { Collection } from "./collections.type.js";

export class UnknownCollection extends Error {
  constructor() {
    super("No such collection");
  }
}

export class CollectionNotEmpty extends Error {
  constructor() {
    super("Move or delete the scenes in this collection before deleting it");
  }
}

export function toCollection(row: CollectionRow, teamIds: string[]): Collection {
  return { id: row.id, name: row.name, createdBy: row.createdBy, createdAt: row.createdAt, teamIds };
}
