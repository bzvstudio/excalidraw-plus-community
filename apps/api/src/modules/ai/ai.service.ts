import { generateText, type LanguageModel, type ModelMessage, streamText } from "ai";
import { auditActorOf, auditEvent } from "../audit/audit.utils.js";
import type { WorkspaceAiKeyRow } from "@repo/db";
import type { Principal } from "../auth/auth.type.js";
import { store } from "../../stores/index.js";
import type { AccessService } from "../access/access.type.js";
import { assertCan, WorkspaceAccessDenied } from "../authorization/authorization.utils.js";
import type { Sealer } from "../encryption/encryption.type.js";
import { UnknownScene } from "../scenes/scenes.utils.js";
import type { WorkspacesService } from "../workspaces/workspaces.type.js";
import { UnknownWorkspace } from "../workspaces/workspaces.utils.js";
import {
  AI_FAILURE_MESSAGE,
  AI_IMAGE_MAX_BYTES,
  AI_KEY_CHECK,
  AI_MAX_OUTPUT_TOKENS,
  AI_MAX_RETRIES,
  AI_TIMEOUTS,
  TEXT_TO_DIAGRAM_SYSTEM_PROMPT,
  WIREFRAME_TO_CODE_SYSTEM_PROMPT,
} from "./ai.const.js";
import type { AiService, AiStream, ModelFactory, ModelKind, StreamChunk } from "./ai.type.js";
import {
  AiImageNotPng,
  AiImageTooLarge,
  AiKeyRefused,
  AiLimitReached,
  aiKeySealContext,
  AiUnavailable,
  createFenceStripper,
  describeFailure,
  finishReasonOf,
  isPng,
  pngBytesOf,
  recentMessages,
  summaryOf,
  utcDayOf,
  wireframePrompt,
} from "./ai.utils.js";

export function createAiService(options: {
  models: { text?: LanguageModel; vision?: LanguageModel };
  modelFor: ModelFactory;
  dailyLimit: number;
  sealer: Sealer;
  access: AccessService;
  workspaces: Pick<WorkspacesService, "membership">;
  log: (line: string) => void;
  timeouts?: { totalMs: number; chunkMs: number };
  now?: () => Date;
}): AiService {
  const { models, modelFor, dailyLimit, sealer, access, workspaces, log } = options;
  const timeouts = options.timeouts ?? AI_TIMEOUTS;
  const now = options.now ?? (() => new Date());

  const failed = (error: unknown): StreamChunk => {
    log(`An AI request failed: ${describeFailure(error)}`);
    return { type: "error", error: { message: AI_FAILURE_MESSAGE } };
  };

  async function* streamed(
    model: LanguageModel,
    system: string,
    messages: ModelMessage[],
    maxOutputTokens: number,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const fences = createFenceStripper();
    try {
      const result = streamText({
        model,
        system,
        messages,
        maxOutputTokens,
        maxRetries: AI_MAX_RETRIES,
        timeout: timeouts,
        abortSignal: signal,
        onError: () => undefined,
      });
      for await (const part of result.fullStream) {
        if (part.type === "text-delta") {
          const delta = fences.push(part.text);
          if (delta) yield { type: "content", delta };
        } else if (part.type === "error") {
          yield failed(part.error);
          return;
        } else if (part.type === "finish") {
          const rest = fences.finish();
          if (rest) yield { type: "content", delta: rest };
          yield { type: "done", finishReason: finishReasonOf(part.finishReason) };
          return;
        }
      }
      if (!signal?.aborted) yield failed(new Error("The provider stopped answering"));
    } catch (error) {
      if (signal?.aborted) return;
      yield failed(error);
    }
  }

  const membershipOfSceneWorkspace = async (userId: string, workspaceId: string) => {
    try {
      return await workspaces.membership(userId, workspaceId);
    } catch (error) {
      if (error instanceof UnknownWorkspace) throw new UnknownScene();
      throw error;
    }
  };

  const requireEditor = async (principal: Principal, sceneId: string) => {
    const scene = await store.scenes.getSummaryById(sceneId);
    if (!scene) throw new UnknownScene();
    const actor = await membershipOfSceneWorkspace(principal.userId, scene.workspaceId);
    const sceneAccess = await access.sceneAccess(actor, scene);
    if (sceneAccess === "none") throw new UnknownScene();
    if (sceneAccess !== "edit") throw new WorkspaceAccessDenied("scene.edit");
    return scene;
  };

  const ownModel = (row: WorkspaceAiKeyRow, kind: ModelKind) => {
    const modelId = kind === "text" ? row.model : row.visionModel;
    if (!modelId) return undefined;
    return modelFor(row.provider, sealer.open(row.apiKey, aiKeySealContext(row.workspaceId)).toString("utf8"), modelId);
  };

  const modelForRequest = async (
    principal: Principal,
    workspaceId: string,
    kind: ModelKind,
  ): Promise<{ model: LanguageModel; allowance?: AiStream["allowance"] }> => {
    const own = await store.workspaceAiKeys.get(workspaceId);
    if (own) {
      const model = ownModel(own, kind);
      if (!model) throw new AiUnavailable();
      return { model };
    }
    const model = models[kind];
    if (!model) throw new AiUnavailable();
    if (dailyLimit === 0) return { model };
    const count = await store.aiUsage.upsertIncrementBelow(principal.userId, utcDayOf(now()), dailyLimit);
    if (count === undefined) throw new AiLimitReached(dailyLimit);
    return { model, allowance: { limit: dailyLimit, remaining: dailyLimit - count } };
  };

  const checkKey = async (model: LanguageModel, signal?: AbortSignal) => {
    try {
      await generateText({
        model,
        prompt: AI_KEY_CHECK.prompt,
        maxOutputTokens: AI_KEY_CHECK.maxOutputTokens,
        maxRetries: 0,
        timeout: { totalMs: AI_KEY_CHECK.timeoutMs },
        abortSignal: signal,
      });
    } catch (error) {
      log(`A workspace AI key was refused: ${describeFailure(error)}`);
      throw new AiKeyRefused();
    }
  };

  return {
    textToDiagramAvailable: models.text !== undefined,
    diagramToCodeAvailable: models.vision !== undefined,

    optionsFor: async (actor) => {
      const own = await store.workspaceAiKeys.get(actor.workspaceId);
      if (own) return { textToDiagram: true, diagramToCode: own.visionModel !== null };
      return { textToDiagram: models.text !== undefined, diagramToCode: models.vision !== undefined };
    },

    textToDiagram: async (principal, sceneId, messages, signal) => {
      const scene = await requireEditor(principal, sceneId);
      const { model, allowance } = await modelForRequest(principal, scene.workspaceId, "text");
      const chunks = streamed(model, TEXT_TO_DIAGRAM_SYSTEM_PROMPT, recentMessages(messages), AI_MAX_OUTPUT_TOKENS.diagram, signal);
      return { chunks, allowance };
    },

    diagramToCode: async (principal, sceneId, { texts, image, theme }, signal) => {
      const scene = await requireEditor(principal, sceneId);
      const png = pngBytesOf(image);
      if (png.length > AI_IMAGE_MAX_BYTES) throw new AiImageTooLarge();
      if (!isPng(png)) throw new AiImageNotPng();
      const { model, allowance } = await modelForRequest(principal, scene.workspaceId, "vision");
      const request: ModelMessage = {
        role: "user",
        content: [
          { type: "text", text: wireframePrompt(texts, theme) },
          { type: "image", image: png, mediaType: "image/png" },
        ],
      };
      const chunks = streamed(model, WIREFRAME_TO_CODE_SYSTEM_PROMPT, [request], AI_MAX_OUTPUT_TOKENS.page, signal);
      return { chunks, allowance };
    },

    workspaceKey: async (actor) => {
      assertCan(actor, "workspace.view");
      const row = await store.workspaceAiKeys.get(actor.workspaceId);
      return row ? summaryOf(row) : null;
    },

    setWorkspaceKey: async (actor, { provider, apiKey, model, visionModel }, signal) => {
      assertCan(actor, "workspace.manage");
      await Promise.all(
        [model, visionModel].flatMap((modelId) => (modelId ? [checkKey(modelFor(provider, apiKey, modelId), signal)] : [])),
      );
      const sealed = sealer.seal(Buffer.from(apiKey, "utf8"), aiKeySealContext(actor.workspaceId));
      const updatedAt = now();
      const row = await store.transaction(async (tx) => {
        const saved = await store.workspaceAiKeys.upsert(
          {
            workspaceId: actor.workspaceId,
            provider,
            model,
            visionModel,
            apiKey: sealed.bytes,
            apiKeyKeyId: sealed.keyId,
            lastFour: apiKey.slice(-4),
            updatedAt,
          },
          tx,
        );
        await store.auditEvents.add(
          auditEvent({
            workspaceId: actor.workspaceId,
            action: "ai_key.set",
            actor: auditActorOf(actor),
            metadata: { provider, model, visionModel },
            at: updatedAt,
          }),
          tx,
        );
        return saved;
      });
      return summaryOf(row);
    },

    removeWorkspaceKey: async (actor) => {
      assertCan(actor, "workspace.manage");
      await store.transaction(async (tx) => {
        if (!(await store.workspaceAiKeys.delete(actor.workspaceId, tx))) return;
        await store.auditEvents.add(
          auditEvent({ workspaceId: actor.workspaceId, action: "ai_key.removed", actor: auditActorOf(actor), at: now() }),
          tx,
        );
      });
    },

    resealNext: async (limit) => {
      const rows = await store.workspaceAiKeys.getAllWorkspaceIdsNotSealedWith(sealer.currentKeyId, limit);
      for (const { workspaceId } of rows) {
        await store.transaction(async (tx) => {
          const row = await store.workspaceAiKeys.getForUpdate(workspaceId, tx);
          if (!row || row.apiKeyKeyId === sealer.currentKeyId) return;
          const context = aiKeySealContext(workspaceId);
          const resealed = sealer.seal(sealer.open(row.apiKey, context), context);
          await store.workspaceAiKeys.update(workspaceId, { apiKey: resealed.bytes, apiKeyKeyId: resealed.keyId }, tx);
        });
      }
      return rows.length;
    },
  };
}
