import { z } from "zod";
import { matchesETag, UnknownThumbnail } from "../../modules/thumbnails/thumbnails.utils.js";
import type { Services } from "../../types/services.js";
import { signedInRoutes } from "../signed-in.js";

const thumbnailParamsSchema = z.object({ workspaceId: z.uuid(), sceneId: z.uuid() });

export function createThumbnailsRoutes(services: Pick<Services, "auth" | "workspaces" | "thumbnails">) {
  const target = async (userId: string, params: Record<string, string>) => {
    const parsed = thumbnailParamsSchema.safeParse(params);
    if (!parsed.success) throw new UnknownThumbnail();
    const { workspaceId, sceneId } = parsed.data;
    return { actor: await services.workspaces.membership(userId, workspaceId), sceneId };
  };

  return signedInRoutes(services.auth)
    .put("/:workspaceId/:sceneId", async (c) => {
      const { actor, sceneId } = await target(c.get("principal").userId, c.req.param());
      const { etag } = await services.thumbnails.put(actor, sceneId, Buffer.from(await c.req.arrayBuffer()));
      return c.body(null, 204, { etag });
    })
    .get("/:workspaceId/:sceneId", async (c) => {
      const { actor, sceneId } = await target(c.get("principal").userId, c.req.param());
      const thumbnail = await services.thumbnails.get(actor, sceneId);
      const headers = { etag: thumbnail.etag, "cache-control": "no-cache" };
      if (matchesETag(c.req.header("if-none-match"), thumbnail.etag)) return c.body(null, 304, headers);
      return c.body(new Uint8Array(thumbnail.bytes), 200, { ...headers, "content-type": "image/png" });
    });
}
