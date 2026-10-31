import { z } from "zod";
import { createApiKeySchema } from "../../modules/api-keys/api-keys.const.js";
import { router, workspaceProcedure } from "../procedures.js";

export const apiKeysRouter = router({
  list: workspaceProcedure.query(({ ctx }) => ctx.services.apiKeys.list(ctx.member)),

  create: workspaceProcedure.input(createApiKeySchema).mutation(({ ctx, input }) => ctx.services.apiKeys.create(ctx.member, input)),

  revoke: workspaceProcedure
    .input(z.object({ keyId: z.uuid() }))
    .mutation(({ ctx, input }) => ctx.services.apiKeys.revoke(ctx.member, input.keyId)),
});
