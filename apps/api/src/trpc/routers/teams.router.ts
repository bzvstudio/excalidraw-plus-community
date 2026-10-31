import { z } from "zod";
import { teamNameSchema } from "../../modules/teams/teams.const.js";
import { router, workspaceProcedure } from "../procedures.js";

const teamInput = z.object({ teamId: z.uuid() });

export const teamsRouter = router({
  list: workspaceProcedure.query(({ ctx }) => ctx.services.teams.list(ctx.member)),

  create: workspaceProcedure
    .input(z.object({ name: teamNameSchema }))
    .mutation(({ ctx, input }) => ctx.services.teams.create(ctx.member, input.name)),

  rename: workspaceProcedure
    .input(teamInput.extend({ name: teamNameSchema }))
    .mutation(({ ctx, input }) => ctx.services.teams.rename(ctx.member, input.teamId, input.name)),

  delete: workspaceProcedure
    .input(teamInput)
    .mutation(({ ctx, input }) => ctx.services.teams.delete(ctx.member, input.teamId)),

  addMember: workspaceProcedure
    .input(teamInput.extend({ userId: z.string().min(1).max(100) }))
    .mutation(({ ctx, input }) => ctx.services.teams.addMember(ctx.member, input.teamId, input.userId)),

  removeMember: workspaceProcedure
    .input(teamInput.extend({ userId: z.string().min(1).max(100) }))
    .mutation(({ ctx, input }) => ctx.services.teams.removeMember(ctx.member, input.teamId, input.userId)),
});
