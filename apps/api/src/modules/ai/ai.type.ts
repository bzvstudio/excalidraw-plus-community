import type { LanguageModel } from "ai";
import type { Principal } from "../auth/auth.type.js";
import type { Membership } from "../authorization/authorization.type.js";
import type { AI_PROVIDERS, WORKSPACE_AI_PROVIDERS } from "./ai.const.js";

export type AiProvider = (typeof AI_PROVIDERS)[number];

export type WorkspaceAiProvider = (typeof WORKSPACE_AI_PROVIDERS)[number];

export type ModelFactory = (provider: WorkspaceAiProvider, apiKey: string, modelId: string) => LanguageModel;

export type WorkspaceAiKeyInput = {
  provider: WorkspaceAiProvider;
  apiKey: string;
  model: string;
  visionModel: string | null;
};

export type WorkspaceAiKeySummary = {
  provider: WorkspaceAiProvider;
  model: string;
  visionModel: string | null;
  lastFour: string;
  updatedAt: Date;
};

export type ModelKind = "text" | "vision";

export type AiAllowance = { limit: number; remaining: number };

export type AiStream = {
  chunks: AsyncIterable<StreamChunk>;
  allowance?: AiAllowance;
};

export type AiOptions = {
  textToDiagram: boolean;
  diagramToCode: boolean;
};

export type LlmMessage = {
  role: "user" | "assistant";
  content: string;
};

export type DiagramFinishReason = "stop" | "length" | "content_filter" | "tool_calls" | null;

export type StreamChunk =
  | { type: "content"; delta: string }
  | { type: "done"; finishReason: DiagramFinishReason }
  | { type: "error"; error: { message: string } };

export type WireframeRequest = {
  texts: readonly string[];
  image: string;
  theme: "light" | "dark";
};

export type AiService = {
  textToDiagramAvailable: boolean;
  diagramToCodeAvailable: boolean;
  optionsFor: (actor: Membership) => Promise<AiOptions>;
  textToDiagram: (
    principal: Principal,
    sceneId: string,
    messages: readonly LlmMessage[],
    signal?: AbortSignal,
  ) => Promise<AiStream>;
  diagramToCode: (
    principal: Principal,
    sceneId: string,
    wireframe: WireframeRequest,
    signal?: AbortSignal,
  ) => Promise<AiStream>;
  workspaceKey: (actor: Membership) => Promise<WorkspaceAiKeySummary | null>;
  setWorkspaceKey: (actor: Membership, input: WorkspaceAiKeyInput, signal?: AbortSignal) => Promise<WorkspaceAiKeySummary>;
  removeWorkspaceKey: (actor: Membership) => Promise<void>;
  resealNext: (limit: number) => Promise<number>;
};
