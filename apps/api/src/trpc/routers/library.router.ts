import { z } from "zod";
import { libraryItemsSchema } from "../../modules/library/library.const.js";
import { protectedProcedure, router } from "../procedures.js";

export const libraryRouter = router({
  get: protectedProcedure.query(({ ctx }) => ctx.services.library.get(ctx.principal)),

  save: protectedProcedure
    .input(z.object({ items: libraryItemsSchema, basedOn: z.number().int().nonnegative() }))
    .mutation(({ ctx, input }) => ctx.services.library.save(ctx.principal, input.items, input.basedOn)),
});
