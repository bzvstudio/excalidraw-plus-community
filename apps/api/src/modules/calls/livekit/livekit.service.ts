import { AccessToken, RoomServiceClient, TrackSource, TwirpError } from "livekit-server-sdk";
import type { CallRooms } from "../calls.type.js";
import { callOrigins } from "../calls.utils.js";

const NOT_FOUND = 404;

export function createLiveKitRooms(options: { url: string; apiKey: string; apiSecret: string }): CallRooms {
  const { url, apiKey, apiSecret } = options;
  const [, apiOrigin] = callOrigins(url);
  const service = new RoomServiceClient(apiOrigin!, apiKey, apiSecret);

  return {
    issueToken: async ({ room, identity, name, avatarId, ttlSeconds }) => {
      const token = new AccessToken(apiKey, apiSecret, { identity, name, metadata: JSON.stringify({ avatarId }), ttl: ttlSeconds });
      token.addGrant({
        room,
        roomJoin: true,
        canSubscribe: true,
        canPublish: true,
        canPublishSources: [TrackSource.MICROPHONE, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO],
        canPublishData: false,
        canUpdateOwnMetadata: false,
      });
      return token.toJwt();
    },

    listRooms: async () => (await service.listRooms()).map((room) => room.name),

    listIdentities: async (room) => {
      try {
        return (await service.listParticipants(room)).map((participant) => participant.identity);
      } catch (error) {
        if (error instanceof TwirpError && error.status === NOT_FOUND) return [];
        throw error;
      }
    },

    removeParticipant: async (room, identity) => {
      try {
        await service.removeParticipant(room, identity);
      } catch (error) {
        if (!(error instanceof TwirpError && error.status === NOT_FOUND)) throw error;
      }
    },
  };
}
