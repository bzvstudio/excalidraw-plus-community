import { publicProcedure, router } from "../procedures.js";

export const sessionRouter = router({
  get: publicProcedure.query(({ ctx }) => ctx.principal),
});
