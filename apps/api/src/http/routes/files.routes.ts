import { z } from "zod";
import { fileIdSchema } from "../../modules/files/files.const.js";
import { UnknownFile } from "../../modules/files/files.utils.js";
import type { Services } from "../../types/services.js";
import { signedInRoutes } from "../signed-in.js";

const FILE_CACHE_CONTROL = "private, max-age=31536000, immutable";

const fileParamsSchema = z.object({ workspaceId: z.uuid(), sceneId: z.uuid(), fileId: fileIdSchema });

export function createFilesRoutes(services: Pick<Services, "auth" | "workspaces" | "files">) {
  const target = async (userId: string, params: Record<string, string>) => {
    const parsed = fileParamsSchema.safeParse(params);
    if (!parsed.success) throw new UnknownFile();
    const { workspaceId, sceneId, fileId } = parsed.data;
    return { actor: await services.workspaces.membership(userId, workspaceId), sceneId, fileId };
  };

  return signedInRoutes(services.auth)
    .put("/:workspaceId/:sceneId/:fileId", async (c) => {
      const { actor, sceneId, fileId } = await target(c.get("principal").userId, c.req.param());
      await services.files.put(actor, sceneId, fileId, Buffer.from(await c.req.arrayBuffer()));
      return c.body(null, 204);
    })
    .get("/:workspaceId/:sceneId/:fileId", async (c) => {
      const { actor, sceneId, fileId } = await target(c.get("principal").userId, c.req.param());
      const file = await services.files.get(actor, sceneId, fileId);
      return c.body(new Uint8Array(file.bytes), 200, {
        "content-type": file.mimeType,
        "cache-control": FILE_CACHE_CONTROL,
      });
    });
}
