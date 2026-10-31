import { AI_HISTORY_MAX_MESSAGES, AI_KEY_SEAL_KIND, PNG_SIGNATURE } from "./ai.const.js";
import type { WorkspaceAiKeyRow } from "@repo/db";
import type { DiagramFinishReason, LlmMessage, StreamChunk, WorkspaceAiKeySummary } from "./ai.type.js";

export class AiUnavailable extends Error {
  constructor() {
    super("AI is not set up on this server");
  }
}

export class AiImageTooLarge extends Error {
  constructor() {
    super("This frame has too much detail to send. Remove large images, or split it into several frames.");
  }
}

export class AiLimitReached extends Error {
  readonly limit: number;

  constructor(limit: number) {
    super(`You have made today's ${limit} AI requests. More are available after midnight UTC.`);
    this.limit = limit;
  }
}

export class AiKeyRefused extends Error {
  constructor() {
    super("The provider did not accept this key and model. Check both and try again.");
  }
}

export function aiKeySealContext(workspaceId: string) {
  return { kind: AI_KEY_SEAL_KIND, id: workspaceId };
}

export function utcDayOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class AiImageNotPng extends Error {
  constructor() {
    super("The frame's picture is not a PNG");
  }
}

const FENCE = "```";

export function wireframePrompt(texts: readonly string[], theme: "light" | "dark"): string {
  const listed = texts.map((text) => text.trim()).filter(Boolean);
  return [
    `Make the page in a ${theme} colour scheme.`,
    listed.length > 0 ? `The texts in the wireframe are:\n${listed.map((text) => `- ${text}`).join("\n")}` : "The wireframe has no text.",
  ].join("\n\n");
}

export function pngBytesOf(dataUrl: string): Buffer {
  return Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
}

export function isPng(bytes: Buffer): boolean {
  return bytes.subarray(0, PNG_SIGNATURE.length).equals(Buffer.from(PNG_SIGNATURE));
}

export function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  const status = "statusCode" in error && typeof error.statusCode === "number" ? ` (status ${error.statusCode})` : "";
  const cause = "lastError" in error && error.lastError instanceof Error ? `, last: ${describeFailure(error.lastError)}` : "";
  return `${error.name}${status}${cause}`;
}

export function encodeChunk(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

export function recentMessages(messages: readonly LlmMessage[]): LlmMessage[] {
  const recent = messages.slice(-AI_HISTORY_MAX_MESSAGES);
  const firstUser = recent.findIndex((message) => message.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

export function finishReasonOf(reason: string): DiagramFinishReason {
  const reasons: Record<string, DiagramFinishReason> = {
    stop: "stop",
    length: "length",
    "content-filter": "content_filter",
    "tool-calls": "tool_calls",
  };
  return reasons[reason] ?? null;
}

export function createFenceStripper() {
  let opening = "";
  let opened = false;
  let held = "";

  const release = (text: string) => {
    held += text;
    const tail = held.length - held.trimEnd().length;
    const keep = Math.min(held.length, tail + FENCE.length + 2);
    const out = held.slice(0, held.length - keep);
    held = held.slice(held.length - keep);
    return out;
  };

  return {
    push: (delta: string): string => {
      if (opened) return release(delta);
      opening += delta;
      const trimmed = opening.trimStart();
      if (trimmed.length < FENCE.length && !trimmed.includes("\n")) return "";
      if (!trimmed.startsWith(FENCE)) {
        opened = true;
        return release(opening);
      }
      const newline = trimmed.indexOf("\n");
      if (newline === -1) return "";
      opened = true;
      return release(trimmed.slice(newline + 1));
    },
    finish: (): string => {
      const rest = opened ? held : opening;
      const trimmed = rest.trimEnd();
      return trimmed.endsWith(FENCE) ? trimmed.slice(0, -FENCE.length).trimEnd() : rest;
    },
  };
}

export function summaryOf(row: WorkspaceAiKeyRow): WorkspaceAiKeySummary {
  return {
    provider: row.provider,
    model: row.model,
    visionModel: row.visionModel,
    lastFour: row.lastFour,
    updatedAt: row.updatedAt,
  };
}
