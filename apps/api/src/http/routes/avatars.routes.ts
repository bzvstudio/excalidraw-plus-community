import { z } from "zod";
import { UnknownAvatar } from "../../modules/avatars/avatars.utils.js";
import { matchesETag } from "../../modules/thumbnails/thumbnails.utils.js";
import { UnknownWorkspace } from "../../modules/workspaces/workspaces.utils.js";
import type { Services } from "../../types/services.js";
import { signedInRoutes } from "../signed-in.js";

const avatarIdSchema = z.uuid();

const workspaceIdSchema = z.uuid();

export function createAvatarsRoutes(services: Pick<Services, "auth" | "avatars" | "workspaces">) {
  const membership = async (userId: string, workspaceId: string) => {
    const parsed = workspaceIdSchema.safeParse(workspaceId);
    if (!parsed.success) throw new UnknownWorkspace();
    return services.workspaces.membership(userId, parsed.data);
  };

  return signedInRoutes(services.auth)
    .put("/", async (c) => {
      const { etag } = await services.avatars.put(c.get("principal").userId, Buffer.from(await c.req.arrayBuffer()));
      return c.body(null, 204, { etag });
    })
    .delete("/", async (c) => {
      await services.avatars.remove(c.get("principal").userId);
      return c.body(null, 204);
    })
    .put("/workspaces/:workspaceId", async (c) => {
      const actor = await membership(c.get("principal").userId, c.req.param("workspaceId"));
      const { etag } = await services.avatars.putForWorkspace(actor, Buffer.from(await c.req.arrayBuffer()));
      return c.body(null, 204, { etag });
    })
    .delete("/workspaces/:workspaceId", async (c) => {
      const actor = await membership(c.get("principal").userId, c.req.param("workspaceId"));
      await services.avatars.removeForWorkspace(actor);
      return c.body(null, 204);
    })
    .get("/:avatarId", async (c) => {
      const avatarId = avatarIdSchema.safeParse(c.req.param("avatarId"));
      if (!avatarId.success) throw new UnknownAvatar();
      const avatar = await services.avatars.get(c.get("principal").userId, avatarId.data);
      const headers = { etag: avatar.etag, "cache-control": "private, no-cache" };
      if (matchesETag(c.req.header("if-none-match"), avatar.etag)) return c.body(null, 304, headers);
      return c.body(new Uint8Array(avatar.bytes), 200, { ...headers, "content-type": avatar.mimeType });
    });
}
