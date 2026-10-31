import type { Principal } from "../auth/auth.type.js";

export type LibraryItem = {
  id: string;
  elements: Record<string, unknown>[];
  [property: string]: unknown;
};

export type Library = {
  items: LibraryItem[];
  version: number;
};

export type LibraryService = {
  get: (principal: Principal) => Promise<Library>;
  save: (principal: Principal, items: LibraryItem[], basedOn: number) => Promise<{ version: number }>;
  resealNext: (limit: number) => Promise<number>;
};
