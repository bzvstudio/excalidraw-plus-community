import { z } from "zod";
import { INVITABLE_ROLES, WORKSPACE_ROLES } from "../../modules/authorization/authorization.const.js";
import {
  handleSchema,
  inviteMaxUsesSchema,
  inviteValidityDaysSchema,
  slugSchema,
  workspaceNameSchema,
} from "../../modules/workspaces/workspaces.const.js";
import { protectedProcedure, router, workspaceProcedure } from "../procedures.js";

const userIdSchema = z.string().min(1).max(64);

const revokeKeyIdsSchema = z.array(z.uuid()).max(100).default([]);

export const workspacesRouter = router({
  list: protectedProcedure.query(({ ctx }) => ctx.services.workspaces.listForUser(ctx.principal.userId)),

  bySlug: protectedProcedure
    .input(z.object({ slug: slugSchema }))
    .query(({ ctx, input }) => ctx.services.workspaces.getBySlug(ctx.principal.userId, input.slug)),

  create: protectedProcedure
    .input(z.object({ name: workspaceNameSchema, handle: handleSchema.optional() }))
    .mutation(({ ctx, input }) => ctx.services.workspaces.create(ctx.principal.userId, input.name, input.handle)),

  members: workspaceProcedure.query(({ ctx }) => ctx.services.workspaces.listMembers(ctx.member)),

  updateSettings: workspaceProcedure
    .input(z.object({ guestEditLinks: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.services.workspaces.updateSettings(ctx.member, { guestEditLinks: input.guestEditLinks }),
    ),

  changeRole: workspaceProcedure
    .input(z.object({ userId: userIdSchema, role: z.enum(WORKSPACE_ROLES), revokeKeyIds: revokeKeyIdsSchema }))
    .mutation(({ ctx, input }) => ctx.services.workspaces.changeRole(ctx.member, input.userId, input.role, input.revokeKeyIds)),

  removeMember: workspaceProcedure
    .input(z.object({ userId: userIdSchema, revokeKeyIds: revokeKeyIdsSchema }))
    .mutation(({ ctx, input }) => ctx.services.workspaces.removeMember(ctx.member, input.userId, input.revokeKeyIds)),

  leave: workspaceProcedure
    .input(z.object({ transferTo: userIdSchema.optional(), revokeKeyIds: revokeKeyIdsSchema }))
    .mutation(({ ctx, input }) =>
      ctx.services.workspaces.leave(ctx.member, { transferTo: input.transferTo, revokeKeyIds: input.revokeKeyIds }),
    ),

  delete: workspaceProcedure.mutation(({ ctx }) => ctx.services.workspaces.delete(ctx.member)),

  removed: workspaceProcedure.query(({ ctx }) => ctx.services.workspaces.listRemoved(ctx.member)),

  readmit: workspaceProcedure
    .input(z.object({ userId: userIdSchema }))
    .mutation(({ ctx, input }) => ctx.services.workspaces.readmit(ctx.member, input.userId)),

  invites: workspaceProcedure.query(({ ctx }) => ctx.services.workspaces.listInvites(ctx.member)),

  createInvite: workspaceProcedure
    .input(
      z.object({
        role: z.enum(INVITABLE_ROLES),
        validForDays: inviteValidityDaysSchema,
        maxUses: inviteMaxUsesSchema.optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.services.workspaces.createInvite(ctx.member, input.role, input.validForDays, input.maxUses),
    ),

  emailInvite: workspaceProcedure
    .input(
      z.object({ to: z.email().max(254), role: z.enum(INVITABLE_ROLES), validForDays: inviteValidityDaysSchema }),
    )
    .mutation(({ ctx, input }) =>
      ctx.services.workspaces.emailInvite(ctx.member, { ...input, inviterName: ctx.principal.name }),
    ),

  revokeInvite: workspaceProcedure
    .input(z.object({ inviteId: z.uuid() }))
    .mutation(({ ctx, input }) => ctx.services.workspaces.revokeInvite(ctx.member, input.inviteId)),
});
