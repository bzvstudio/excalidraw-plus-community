import type { Socket } from "socket.io";
import {
  followSchema,
  JOIN_BURST,
  JOIN_PER_SECOND,
  joinSchema,
  PRESENCE_BURST,
  PRESENCE_PER_SECOND,
  PRESENT_BURST,
  PRESENT_PER_SECOND,
  presenceSchema,
  presentSchema,
  updateSchemaWithin,
} from "../modules/collab/collab.const.js";
import type { ClientEvents, CollabService, Connected, ServerEvents } from "../modules/collab/collab.type.js";
import { createRateLimit, seatFor } from "../modules/collab/collab.utils.js";
import { answer, refused, unanswered } from "./refusals.js";

export type CollabSocket = Socket<ClientEvents, ServerEvents, Record<string, never>, Connected>;

export function registerCollabHandlers(socket: CollabSocket, collab: CollabService, maxElements: number) {
  const updateSchema = updateSchemaWithin(maxElements);
  const withinRate = createRateLimit(PRESENCE_BURST, PRESENCE_PER_SECOND);
  const withinPresentRate = createRateLimit(PRESENT_BURST, PRESENT_PER_SECOND);
  const withinJoinRate = createRateLimit(JOIN_BURST, JOIN_PER_SECOND);

  socket.on("join", async (request, ack) => {
    if (typeof ack !== "function") return;
    if (!withinJoinRate()) return ack(refused("unavailable"));
    const parsed = joinSchema.safeParse(request);
    if (!parsed.success) return ack(refused("invalid"));
    const seat = seatFor(parsed.data, socket.data);
    if (!seat) return ack(refused("not_found"));
    ack(await answer(() => collab.join(socket.id, seat)));
  });

  socket.on("update", async (changes, ack) => {
    if (typeof ack !== "function") return;
    const editor = await answer(() => (collab.requireEditor(socket.id), {}));
    if (!editor.ok) return ack(editor);
    const parsed = updateSchema.safeParse(changes);
    if (!parsed.success) return ack(refused("invalid"));
    ack(
      await answer(() => {
        collab.update(socket.id, parsed.data);
        return {};
      }),
    );
  });

  socket.on("presence", (presence) => {
    if (!withinRate()) return;
    const parsed = presenceSchema.safeParse(presence);
    if (parsed.success) unanswered(() => collab.presence(socket.id, parsed.data));
  });

  socket.on("follow", (follow) => {
    if (!withinRate()) return;
    const parsed = followSchema.safeParse(follow);
    if (parsed.success) unanswered(() => collab.follow(socket.id, parsed.data));
  });

  socket.on("present", (present) => {
    if (!withinPresentRate()) return;
    const parsed = presentSchema.safeParse(present);
    if (parsed.success) unanswered(() => collab.present(socket.id, parsed.data));
  });

  socket.on("disconnect", () => void collab.leave(socket.id));
}
