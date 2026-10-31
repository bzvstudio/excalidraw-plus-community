import { z } from "zod";
import { inviteTokenSchema } from "../../modules/workspaces/workspaces.const.js";
import { protectedProcedure, publicProcedure, router } from "../procedures.js";

const tokenInput = z.object({ token: inviteTokenSchema });

export const invitesRouter = router({
  preview: publicProcedure
    .input(tokenInput)
    .mutation(({ ctx, input }) => ctx.services.workspaces.previewInvite(input.token)),

  accept: protectedProcedure
    .input(tokenInput)
    .mutation(({ ctx, input }) => ctx.services.workspaces.acceptInvite(ctx.principal.userId, input.token)),
});
