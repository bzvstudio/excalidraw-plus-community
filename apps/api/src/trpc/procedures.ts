import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { WorkspaceAccessDenied } from "../modules/authorization/authorization.utils.js";
import { CollectionNotEmpty, UnknownCollection } from "../modules/collections/collections.utils.js";
import { CommentDenied, UnknownComment, UnknownThread } from "../modules/comments/comments.utils.js";
import { CannotDecrypt } from "../modules/encryption/encryption.utils.js";
import { LibraryChangedElsewhere, LibraryTooLarge } from "../modules/library/library.utils.js";
import { ShareLinkExpired, ShareLinkRevoked, UnknownShareLink } from "../modules/sharing/sharing.utils.js";
import { TeamInUse, TeamNameTaken, UnknownTeam } from "../modules/teams/teams.utils.js";
import {
  SceneDeleteDenied,
  SceneDraftDenied,
  SceneMoveDenied,
  SceneTooLarge,
  UnknownScene,
} from "../modules/scenes/scenes.utils.js";
import {
  EmailUnavailable,
  HandleTaken,
  InviteNoLongerUsable,
  LastAdministrator,
  UnknownInvite,
  UnknownMember,
  UnknownRemoval,
  RemovedFromWorkspace,
  TooManyInviteEmails,
  UnknownWorkspace,
} from "../modules/workspaces/workspaces.utils.js";
import { AiKeyRefused } from "../modules/ai/ai.utils.js";
import { UnknownApiKey } from "../modules/api-keys/api-keys.utils.js";
import { InvalidAuditCursor } from "../modules/audit/audit.utils.js";
import { CallsUnavailable, TooManyCallJoins } from "../modules/calls/calls.utils.js";
import type { Context } from "./context.js";

const t = initTRPC.context<Context>().create({
  errorFormatter: ({ shape }) =>
    shape.data.code === "INTERNAL_SERVER_ERROR"
      ? { ...shape, message: "Something went wrong", data: { ...shape.data, stack: undefined } }
      : shape,
});

export const router = t.router;

const REFUSAL_CODES = [
  [WorkspaceAccessDenied, "FORBIDDEN"],
  [UnknownWorkspace, "NOT_FOUND"],
  [UnknownMember, "NOT_FOUND"],
  [UnknownRemoval, "NOT_FOUND"],
  [RemovedFromWorkspace, "FORBIDDEN"],
  [UnknownInvite, "NOT_FOUND"],
  [InviteNoLongerUsable, "PRECONDITION_FAILED"],
  [LastAdministrator, "CONFLICT"],
  [HandleTaken, "CONFLICT"],
  [EmailUnavailable, "PRECONDITION_FAILED"],
  [TooManyInviteEmails, "TOO_MANY_REQUESTS"],
  [UnknownScene, "NOT_FOUND"],
  [SceneTooLarge, "PAYLOAD_TOO_LARGE"],
  [SceneDeleteDenied, "FORBIDDEN"],
  [SceneDraftDenied, "FORBIDDEN"],
  [SceneMoveDenied, "FORBIDDEN"],
  [UnknownCollection, "NOT_FOUND"],
  [CollectionNotEmpty, "PRECONDITION_FAILED"],
  [UnknownTeam, "NOT_FOUND"],
  [TeamNameTaken, "CONFLICT"],
  [TeamInUse, "PRECONDITION_FAILED"],
  [LibraryChangedElsewhere, "CONFLICT"],
  [LibraryTooLarge, "PAYLOAD_TOO_LARGE"],
  [UnknownShareLink, "NOT_FOUND"],
  [ShareLinkRevoked, "PRECONDITION_FAILED"],
  [ShareLinkExpired, "PRECONDITION_FAILED"],
  [UnknownThread, "NOT_FOUND"],
  [UnknownComment, "NOT_FOUND"],
  [CommentDenied, "FORBIDDEN"],
  [CannotDecrypt, "UNPROCESSABLE_CONTENT"],
  [AiKeyRefused, "BAD_REQUEST"],
  [CallsUnavailable, "SERVICE_UNAVAILABLE"],
  [TooManyCallJoins, "TOO_MANY_REQUESTS"],
  [UnknownApiKey, "NOT_FOUND"],
  [InvalidAuditCursor, "BAD_REQUEST"],
] as const;

const reportRefusals = t.middleware(async ({ next }) => {
  const result = await next();
  if (result.ok) return result;

  const cause = result.error.cause;
  for (const [refusal, code] of REFUSAL_CODES) {
    if (cause instanceof refusal) throw new TRPCError({ code, message: cause.message, cause });
  }

  return result;
});

export const publicProcedure = t.procedure.use(reportRefusals);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.principal) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { ...ctx, principal: ctx.principal } });
});

export const workspaceProcedure = protectedProcedure
  .input(z.object({ workspaceId: z.uuid() }))
  .use(async ({ ctx, input, next }) =>
    next({ ctx: { ...ctx, member: await ctx.services.workspaces.membership(ctx.principal.userId, input.workspaceId) } }),
  );

export const linkProcedure = publicProcedure
  .input(z.object({ linkId: z.uuid() }))
  .use(async ({ ctx, input, next }) =>
    next({ ctx: { ...ctx, grant: await ctx.services.sharing.grantFor(input.linkId, ctx.visitor, ctx.principal) } }),
  );

export const commenterProcedure = publicProcedure
  .input(z.union([z.object({ workspaceId: z.uuid(), sceneId: z.uuid() }), z.object({ linkId: z.uuid() })]))
  .use(async ({ ctx, input, next }) => {
    const { comments, sharing, workspaces } = ctx.services;
    if ("linkId" in input) {
      const grant = await sharing.grantFor(input.linkId, ctx.visitor, ctx.principal);
      return next({ ctx: { ...ctx, commenter: comments.commenterForGrant(grant) } });
    }
    if (!ctx.principal) throw new TRPCError({ code: "UNAUTHORIZED" });
    const member = await workspaces.membership(ctx.principal.userId, input.workspaceId);
    return next({ ctx: { ...ctx, commenter: await comments.commenterForMember(member, input.sceneId) } });
  });
