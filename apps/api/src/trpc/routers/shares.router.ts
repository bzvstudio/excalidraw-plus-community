import { z } from "zod";
import { SHARE_LINK_VALIDITY_DAYS, SHARE_ROLES } from "../../modules/sharing/sharing.const.js";
import { router, workspaceProcedure } from "../procedures.js";

const sceneInput = z.object({ sceneId: z.uuid() });

export const sharesRouter = router({
  list: workspaceProcedure
    .input(sceneInput)
    .query(({ ctx, input }) => ctx.services.sharing.list(ctx.member, input.sceneId)),

  create: workspaceProcedure
    .input(
      sceneInput.extend({
        role: z.enum(SHARE_ROLES),
        validForDays: z.union([z.literal(SHARE_LINK_VALIDITY_DAYS), z.null()]),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.services.sharing.create(ctx.member, input.sceneId, input.role, input.validForDays),
    ),

  revoke: workspaceProcedure
    .input(sceneInput.extend({ linkId: z.uuid() }))
    .mutation(({ ctx, input }) => ctx.services.sharing.revoke(ctx.member, input.sceneId, input.linkId)),
});
