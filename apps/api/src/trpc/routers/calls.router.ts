import { TRPCError } from "@trpc/server";
import { joinSchema } from "../../modules/collab/collab.const.js";
import { seatFor } from "../../modules/collab/collab.utils.js";
import { publicProcedure, router } from "../procedures.js";

export const callsRouter = router({
  join: publicProcedure.input(joinSchema).mutation(({ ctx, input }) => {
    const seat = seatFor(input, { principal: ctx.principal, visitor: ctx.visitor, session: ctx.session });
    if (!seat) throw new TRPCError({ code: "UNAUTHORIZED" });
    return ctx.services.calls.join(seat);
  }),
});
