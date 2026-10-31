import { publicProcedure, router } from "../procedures.js";

export const configRouter = router({
  get: publicProcedure.query(({ ctx }) => ctx.services.system.getRuntimeConfig()),
});
