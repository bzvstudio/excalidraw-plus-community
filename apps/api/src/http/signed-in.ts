import { Hono } from "hono";
import type { Principal } from "../modules/auth/auth.type.js";
import type { Services } from "../types/services.js";
import { answerRefusal } from "./refusals.js";

export function signedInRoutes(auth: Pick<Services["auth"], "principalFor">) {
  return new Hono<{ Variables: { principal: Principal } }>()
    .onError(answerRefusal)
    .use("*", async (c, next) => {
      const principal = await auth.principalFor(c.req.raw.headers);
      if (!principal) return c.json({ error: "Sign in first" }, 401);
      c.set("principal", principal);
      await next();
    });
}
