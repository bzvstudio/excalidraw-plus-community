import type { Context } from "hono";
import { stream } from "hono/streaming";
import { z } from "zod";
import { diagramToCodeSchema, llmMessagesSchema } from "../../modules/ai/ai.const.js";
import type { AiAllowance, AiStream } from "../../modules/ai/ai.type.js";
import { AiLimitReached, encodeChunk } from "../../modules/ai/ai.utils.js";
import { UnknownScene } from "../../modules/scenes/scenes.utils.js";
import type { Services } from "../../types/services.js";
import { signedInRoutes } from "../signed-in.js";

const textToDiagramSchema = z.object({ messages: llmMessagesSchema });

function sceneIdOf(param: string) {
  const sceneId = z.uuid().safeParse(param);
  if (!sceneId.success) throw new UnknownScene();
  return sceneId.data;
}

function tellAllowance(c: Context, { limit, remaining }: AiAllowance) {
  c.header("x-ratelimit-limit", String(limit));
  c.header("x-ratelimit-remaining", String(remaining));
}

async function streamed(c: Context, start: () => Promise<AiStream>) {
  const { chunks, allowance } = await start().catch((error: unknown) => {
    if (error instanceof AiLimitReached) tellAllowance(c, { limit: error.limit, remaining: 0 });
    throw error;
  });
  if (allowance) tellAllowance(c, allowance);
  c.header("content-type", "text/event-stream");
  c.header("cache-control", "no-store");
  return stream(c, async (sse) => {
    for await (const chunk of chunks) await sse.write(encodeChunk(chunk));
  });
}

export function createAiRoutes(services: Pick<Services, "auth" | "ai">) {
  return signedInRoutes(services.auth)
    .post("/scenes/:sceneId/text-to-diagram", async (c) => {
      const sceneId = sceneIdOf(c.req.param("sceneId"));
      const body = textToDiagramSchema.safeParse(await c.req.json().catch(() => undefined));
      if (!body.success) return c.json({ error: "Send the chat as { messages }" }, 400);
      return streamed(c, () => services.ai.textToDiagram(c.get("principal"), sceneId, body.data.messages, c.req.raw.signal));
    })
    .post("/scenes/:sceneId/diagram-to-code", async (c) => {
      const sceneId = sceneIdOf(c.req.param("sceneId"));
      const body = diagramToCodeSchema.safeParse(await c.req.json().catch(() => undefined));
      if (!body.success) return c.json({ error: "Send the frame as { texts, image, theme }, with the image as a PNG data URL" }, 400);
      return streamed(c, () => services.ai.diagramToCode(c.get("principal"), sceneId, body.data, c.req.raw.signal));
    });
}
