import { z } from "zod";
import {
  SCENE_LIST_LIMIT_MAX,
  sceneContentSchema,
  scenePlaceSchema,
  sceneSearchSchema,
  sceneTitleSchema,
} from "../../modules/scenes/scenes.const.js";
import { router, workspaceProcedure } from "../procedures.js";

const sceneInput = z.object({ sceneId: z.uuid() });

export const scenesRouter = router({
  list: workspaceProcedure
    .input(
      z.object({
        in: scenePlaceSchema.optional(),
        search: sceneSearchSchema.optional(),
        limit: z.number().int().min(1).max(SCENE_LIST_LIMIT_MAX).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.services.scenes.list(ctx.member, { collectionId: input.in, titleContains: input.search, limit: input.limit }),
    ),

  get: workspaceProcedure.input(sceneInput).query(({ ctx, input }) => ctx.services.scenes.get(ctx.member, input.sceneId)),

  create: workspaceProcedure
    .input(
      z.object({
        title: sceneTitleSchema.optional(),
        collectionId: z.uuid().optional(),
        content: sceneContentSchema.optional(),
      }),
    )
    .mutation(({ ctx, input }) => ctx.services.scenes.create(ctx.member, input)),

  move: workspaceProcedure
    .input(sceneInput.extend({ to: scenePlaceSchema }))
    .mutation(({ ctx, input }) => ctx.services.scenes.move(ctx.member, input.sceneId, input.to)),

  rename: workspaceProcedure
    .input(sceneInput.extend({ title: sceneTitleSchema }))
    .mutation(({ ctx, input }) => ctx.services.scenes.rename(ctx.member, input.sceneId, input.title)),

  delete: workspaceProcedure
    .input(sceneInput)
    .mutation(({ ctx, input }) => ctx.services.scenes.delete(ctx.member, input.sceneId)),
});
