import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import { fileIdSchema } from "../../modules/files/files.const.js";
import { UnknownFile } from "../../modules/files/files.utils.js";
import {
  EMBED_AUTHORIZATION_SCHEME,
  GUEST_COOKIE_MAX_AGE_SECONDS,
  guestNameSchema,
} from "../../modules/sharing/sharing.const.js";
import { UnknownShareLink } from "../../modules/sharing/sharing.utils.js";
import type { Services } from "../../types/services.js";
import { answerRefusal } from "../refusals.js";

const tokenSchema = z.string().min(1).max(128);
const openSchema = z.object({ token: tokenSchema, name: guestNameSchema.optional() });

const fileParamsSchema = z.object({ linkId: z.uuid(), fileId: fileIdSchema });

export function createSharedRoutes(services: Pick<Services, "auth" | "sharing" | "files" | "scenes">) {
  const grantFor = async (c: Parameters<typeof getCookie>[0], params: Record<string, string>) => {
    const parsed = fileParamsSchema.safeParse(params);
    if (!parsed.success) throw new UnknownFile();
    const visitor = services.sharing.readVisitor(getCookie(c, services.sharing.cookie.name));
    const principal = await services.auth.principalFor(c.req.raw.headers);
    return { grant: await services.sharing.grantFor(parsed.data.linkId, visitor, principal), fileId: parsed.data.fileId };
  };

  const embedGrant = (authorization: string | undefined) => {
    const [scheme, token] = authorization?.split(" ") ?? [];
    const parsed = tokenSchema.safeParse(token);
    if (scheme !== EMBED_AUTHORIZATION_SCHEME || !parsed.success) throw new UnknownShareLink();
    return services.sharing.grantForEmbed(parsed.data);
  };

  return new Hono()
    .onError(answerRefusal)
    .use("/embed/*", async (c, next) => {
      c.header("cache-control", "private, no-store");
      await next();
    })
    .get("/embed/scene", async (c) => {
      const scene = await services.scenes.getShared(await embedGrant(c.req.header("authorization")));
      return c.json({ title: scene.title, elements: scene.elements, appState: scene.appState });
    })
    .get("/embed/files/:fileId", async (c) => {
      const fileId = fileIdSchema.safeParse(c.req.param("fileId"));
      if (!fileId.success) throw new UnknownFile();
      const file = await services.files.getShared(await embedGrant(c.req.header("authorization")), fileId.data);
      return c.body(new Uint8Array(file.bytes), 200, { "content-type": file.mimeType });
    })
    .post("/open", async (c) => {
      const body = openSchema.safeParse(await c.req.json().catch(() => undefined));
      if (!body.success) return c.json({ error: "Open the link you were sent again" }, 400);
      const principal = await services.auth.principalFor(c.req.raw.headers);
      const visitor = services.sharing.readVisitor(getCookie(c, services.sharing.cookie.name));
      const opened = await services.sharing.open(body.data.token, visitor, body.data.name, principal);
      setCookie(c, services.sharing.cookie.name, services.sharing.writeVisitor(opened.visitor), {
        httpOnly: true,
        sameSite: "Lax",
        path: "/",
        secure: services.sharing.cookie.secure,
        maxAge: GUEST_COOKIE_MAX_AGE_SECONDS,
      });
      return c.json({ linkId: opened.linkId, membership: opened.membership ?? null });
    })
    .put("/:linkId/files/:fileId", async (c) => {
      const { grant, fileId } = await grantFor(c, c.req.param());
      await services.files.putShared(grant, fileId, Buffer.from(await c.req.arrayBuffer()));
      return c.body(null, 204);
    })
    .get("/:linkId/files/:fileId", async (c) => {
      const { grant, fileId } = await grantFor(c, c.req.param());
      const file = await services.files.getShared(grant, fileId);
      return c.body(new Uint8Array(file.bytes), 200, {
        "content-type": file.mimeType,
        "cache-control": "private, no-cache",
      });
    });
}
