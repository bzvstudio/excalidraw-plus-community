import type { AccessChange } from "../access/access.type.js";
import type { Seat } from "../collab/collab.type.js";

export type CallGrant = {
  room: string;
  identity: string;
  name: string;
  avatarId: string | null;
  ttlSeconds: number;
};

export type CallRooms = {
  issueToken: (grant: CallGrant) => Promise<string>;
  listRooms: () => Promise<string[]>;
  listIdentities: (room: string) => Promise<string[]>;
  removeParticipant: (room: string, identity: string) => Promise<void>;
};

export type CallTicket = {
  url: string;
  token: string;
};

export type CallsService = {
  available: boolean;
  join: (seat: Seat) => Promise<CallTicket>;
  revalidate: (change: AccessChange) => Promise<void>;
  revalidateAll: () => Promise<void>;
};
