import { workspaceAiKeySchema } from "../../modules/ai/ai.const.js";
import { router, workspaceProcedure } from "../procedures.js";

export const aiRouter = router({
  options: workspaceProcedure.query(({ ctx }) => ctx.services.ai.optionsFor(ctx.member)),

  workspaceKey: workspaceProcedure.query(({ ctx }) => ctx.services.ai.workspaceKey(ctx.member)),

  setWorkspaceKey: workspaceProcedure
    .input(workspaceAiKeySchema)
    .mutation(({ ctx, input, signal }) => ctx.services.ai.setWorkspaceKey(ctx.member, input, signal)),

  removeWorkspaceKey: workspaceProcedure.mutation(({ ctx }) => ctx.services.ai.removeWorkspaceKey(ctx.member)),
});
