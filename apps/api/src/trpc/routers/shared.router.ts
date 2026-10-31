import { linkProcedure, router } from "../procedures.js";

export const sharedRouter = router({
  get: linkProcedure.query(({ ctx }) => ctx.services.scenes.getShared(ctx.grant)),
});
