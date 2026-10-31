import type { Context, MiddlewareHandler } from "hono";
import { UnknownApiKey } from "../modules/api-keys/api-keys.utils.js";
import type { ApiKeyActor } from "../modules/authorization/authorization.type.js";
import type { Services } from "../types/services.js";

export type ApiKeyEnv = { Variables: { apiKey: ApiKeyActor } };

const BEARER = /^Bearer\s+(\S+)$/i;

export const MISSING_API_KEY = "Send a workspace API key as: Authorization: Bearer <key>";

export function authenticateApiKey(
  apiKeys: Services["apiKeys"],
  refuse: (c: Context<ApiKeyEnv>, message: string) => Response | Promise<Response>,
): MiddlewareHandler<ApiKeyEnv> {
  return async (c, next) => {
    const secret = BEARER.exec(c.req.header("authorization") ?? "")?.[1];
    if (!secret) {
      c.header("WWW-Authenticate", 'Bearer realm="api"');
      return refuse(c, MISSING_API_KEY);
    }
    try {
      c.set("apiKey", await apiKeys.authenticate(secret));
    } catch (error) {
      if (!(error instanceof UnknownApiKey)) throw error;
      c.header("WWW-Authenticate", 'Bearer realm="api", error="invalid_token"');
      return refuse(c, error.message);
    }
    await next();
  };
}
