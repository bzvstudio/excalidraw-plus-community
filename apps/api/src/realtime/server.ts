import type { Server as HttpServer } from "node:http";
import { parse } from "hono/utils/cookie";
import { Server } from "socket.io";
import {
  COLLAB_MESSAGE_ENVELOPE_BYTES,
  PING_INTERVAL_MS,
  PING_TIMEOUT_MS,
  REVALIDATE_INTERVAL_MS,
} from "../modules/collab/collab.const.js";
import type { ClientEvents, CollabChannel, Connected, ServerEvents } from "../modules/collab/collab.type.js";
import { SOCKET_PATH } from "../modules/system/system.const.js";
import type { Container } from "../types/container.js";
import { registerCollabHandlers } from "./collab.handlers.js";

export type RealtimeServer = Server<ClientEvents, ServerEvents, Record<string, never>, Connected>;

export function createRealtimeServer(options: { publicBaseUrl: string; sceneMaxBytes: number }): RealtimeServer {
  return new Server({
    path: SOCKET_PATH,
    serveClient: false,
    pingInterval: PING_INTERVAL_MS,
    pingTimeout: PING_TIMEOUT_MS,
    maxHttpBufferSize: options.sceneMaxBytes + COLLAB_MESSAGE_ENVELOPE_BYTES,
    allowRequest: (request, callback) => {
      const origin = request.headers.origin;
      callback(null, origin === undefined || origin === options.publicBaseUrl);
    },
  });
}

export function socketChannel(io: RealtimeServer): CollabChannel {
  return {
    send: (participantIds, changes) => {
      if (participantIds.length > 0) io.to([...participantIds]).emit("update", changes);
    },
    changeAccess: (participantId, access) => {
      io.to(participantId).emit("access", { access });
    },
    evict: (participantId, reason) => {
      io.to(participantId).emit("evicted", { reason });
      io.in(participantId).disconnectSockets();
    },
    introduce: (participantId, people) => {
      io.to(participantId).emit("people", people);
    },
    arrive: (participantIds, person) => {
      if (participantIds.length > 0) io.to([...participantIds]).emit("arrived", person);
    },
    depart: (participantIds, participantId) => {
      if (participantIds.length > 0) io.to([...participantIds]).emit("departed", { id: participantId });
    },
    relay: (participantIds, presence) => {
      if (participantIds.length > 0) io.volatile.to([...participantIds]).emit("presence", presence);
    },
    followers: (participantId, count) => {
      io.to(participantId).emit("followers", { count });
    },
    presentation: (participantIds, presentation) => {
      if (participantIds.length > 0) io.to([...participantIds]).emit("presentation", presentation);
    },
    commentsChanged: (participantIds, threadId) => {
      if (participantIds.length > 0) io.to([...participantIds]).emit("comments-changed", { threadId });
    },
    fileReady: (participantIds, fileId) => {
      if (participantIds.length > 0) io.to([...participantIds]).emit("file-ready", { fileId });
    },
  };
}

function headersOf(raw: Record<string, string | string[] | undefined>): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(raw)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  return headers;
}

export function attachRealtime(container: Container, httpServer: HttpServer) {
  const { realtime: io, services, env } = container;
  io.use(async (socket, next) => {
    try {
      const headers = headersOf(socket.request.headers);
      const principal = await services.auth.principalFor(headers);
      const visitor = services.sharing.readVisitor(parse(headers.get("cookie") ?? "")[services.sharing.cookie.name]);
      if (!principal && !visitor) return next(new Error("Sign in, or open a share link, to collaborate"));
      socket.data = { principal, visitor, session: headers.get("cookie") ?? undefined };
      next();
    } catch (error) {
      console.error(error);
      next(new Error("The server could not check who you are; it will be tried again"));
    }
  });
  io.on("connection", (socket) => registerCollabHandlers(socket, services.collab, env.SCENE_MAX_ELEMENTS));
  io.attach(httpServer);
  const revalidation = setInterval(() => {
    void services.collab.revalidateAll();
    void services.calls.revalidateAll();
  }, REVALIDATE_INTERVAL_MS);

  return {
    close: async () => {
      clearInterval(revalidation);
      httpServer.close();
      const unsaved = await services.collab.shutdown();
      await io.close();
      return unsaved;
    },
  };
}
