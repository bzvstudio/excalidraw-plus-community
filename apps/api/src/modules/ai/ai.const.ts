import { z } from "zod";

export const AI_PROVIDERS = ["anthropic", "openai", "openai-compatible"] as const;

export const WORKSPACE_AI_PROVIDERS = ["anthropic", "openai"] as const;

export const WORKSPACE_AI_BASE_URLS = { anthropic: "https://api.anthropic.com/v1", openai: "https://api.openai.com/v1" } as const;

export const AI_KEY_SEAL_KIND = "ai-key";

export const AI_DAILY_LIMIT_DEFAULT = 100;

export const AI_KEY_CHECK = { maxOutputTokens: 16, timeoutMs: 15_000, prompt: "Reply with OK." };

export const AI_KEY_MAX_LENGTH = 500;

export const AI_MODEL_NAME_MAX_LENGTH = 200;

export const AI_HISTORY_MAX_MESSAGES = 20;

export const AI_MESSAGE_MAX_LENGTH = 10_000;

export const AI_MAX_OUTPUT_TOKENS = { diagram: 4_096, page: 8_192 };

export const AI_MAX_RETRIES = 1;

export const AI_TIMEOUTS = { totalMs: 60_000, chunkMs: 15_000 };

export const AI_IMAGE_MAX_BYTES = 2_097_152;

export const AI_REQUEST_MAX_BYTES = { chat: 262_144, frame: 3_145_728 };

export const AI_FAILURE_MESSAGE = "The AI could not finish this. Try again in a moment.";

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export const TEXT_TO_DIAGRAM_SYSTEM_PROMPT = [
  "You turn a description into a diagram written in Mermaid.",
  "Use one of these diagram types: flowchart, sequenceDiagram, classDiagram, stateDiagram-v2, erDiagram.",
  "Reply with the Mermaid definition only: no code fences, no explanation, no text before or after it.",
  "Keep labels short, and put labels with punctuation in double quotes.",
  "When the user asks for a change, reply with the whole updated diagram, not only the part that changed.",
].join("\n");

export const WIREFRAME_TO_CODE_SYSTEM_PROMPT = [
  "You turn a picture of a wireframe into one working HTML page that looks like it.",
  "Reply with a single complete HTML document, from <!DOCTYPE html> to </html>, and nothing else: no code fences, no explanation.",
  "Put every style in a <style> element or a style attribute. Use no <script>, no event handler attributes, and no external stylesheets, fonts, images or other resources: the page is shown where none of those load.",
  "Use the texts given as the page's text where they fit, and plain system fonts.",
  "Make it look tidy and usable, close to the layout in the picture.",
].join("\n");

export const diagramToCodeSchema = z.object({
  texts: z.array(z.string().max(AI_MESSAGE_MAX_LENGTH)).max(500),
  image: z.string().startsWith("data:image/png;base64,"),
  theme: z.enum(["light", "dark"]),
});

export const llmMessagesSchema = z
  .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(AI_MESSAGE_MAX_LENGTH) }))
  .min(1)
  .max(200)
  .refine((messages) => messages.some((message) => message.role === "user"), "The chat needs a message from you");

const modelName = z.string().trim().min(1).max(AI_MODEL_NAME_MAX_LENGTH);

export const workspaceAiKeySchema = z.object({
  provider: z.enum(WORKSPACE_AI_PROVIDERS),
  apiKey: z.string().trim().min(8).max(AI_KEY_MAX_LENGTH),
  model: modelName,
  visionModel: modelName.nullable(),
});
