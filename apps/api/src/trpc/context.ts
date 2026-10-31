import type { Context as HonoContext } from "hono";
import { getCookie } from "hono/cookie";
import type { Principal } from "../modules/auth/auth.type.js";
import type { Visitor } from "../modules/sharing/sharing.type.js";
import type { Services } from "../types/services.js";

export type Context = {
  services: Services;
  principal: Principal | null;
  visitor: Visitor | undefined;
  session: string | undefined;
};

export function createContextFactory(services: Services) {
  return async (_options: unknown, c: HonoContext): Promise<Context> => ({
    services,
    principal: await services.auth.principalFor(c.req.raw.headers),
    visitor: services.sharing.readVisitor(getCookie(c, services.sharing.cookie.name)),
    session: c.req.header("cookie"),
  });
}
