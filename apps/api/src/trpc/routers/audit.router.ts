import { auditFilterSchema } from "../../modules/audit/audit.const.js";
import { router, workspaceProcedure } from "../procedures.js";

export const auditRouter = router({
  list: workspaceProcedure
    .input(auditFilterSchema)
    .query(({ ctx, input: { action, actorId, cursor, limit } }) => ctx.services.audit.list(ctx.member, { action, actorId }, { cursor, limit })),
});
