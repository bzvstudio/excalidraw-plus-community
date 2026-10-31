import { z } from "zod";
import { collectionNameSchema } from "../../modules/collections/collections.const.js";
import { router, workspaceProcedure } from "../procedures.js";

const collectionInput = z.object({ collectionId: z.uuid() });

export const collectionsRouter = router({
  list: workspaceProcedure.query(({ ctx }) => ctx.services.collections.list(ctx.member)),

  create: workspaceProcedure
    .input(z.object({ name: collectionNameSchema }))
    .mutation(({ ctx, input }) => ctx.services.collections.create(ctx.member, input.name)),

  rename: workspaceProcedure
    .input(collectionInput.extend({ name: collectionNameSchema }))
    .mutation(({ ctx, input }) => ctx.services.collections.rename(ctx.member, input.collectionId, input.name)),

  delete: workspaceProcedure
    .input(collectionInput)
    .mutation(({ ctx, input }) => ctx.services.collections.delete(ctx.member, input.collectionId)),

  restrict: workspaceProcedure
    .input(collectionInput.extend({ teamIds: z.array(z.uuid()).max(100) }))
    .mutation(({ ctx, input }) => ctx.services.collections.restrict(ctx.member, input.collectionId, input.teamIds)),
});
