import { z } from "zod";
import { commentAnchorSchema, commentBodySchema } from "../../modules/comments/comments.const.js";
import { commenterProcedure, router } from "../procedures.js";

export const commentsRouter = router({
  list: commenterProcedure.query(({ ctx }) => ctx.services.comments.list(ctx.commenter)),

  start: commenterProcedure
    .input(z.object({ anchor: commentAnchorSchema, body: commentBodySchema }))
    .mutation(({ ctx, input }) => ctx.services.comments.start(ctx.commenter, input.anchor, input.body)),

  reply: commenterProcedure
    .input(z.object({ threadId: z.uuid(), body: commentBodySchema }))
    .mutation(({ ctx, input }) => ctx.services.comments.reply(ctx.commenter, input.threadId, input.body)),

  edit: commenterProcedure
    .input(z.object({ commentId: z.uuid(), body: commentBodySchema }))
    .mutation(({ ctx, input }) => ctx.services.comments.edit(ctx.commenter, input.commentId, input.body)),

  remove: commenterProcedure
    .input(z.object({ commentId: z.uuid() }))
    .mutation(({ ctx, input }) => ctx.services.comments.remove(ctx.commenter, input.commentId)),

  resolve: commenterProcedure
    .input(z.object({ threadId: z.uuid(), resolved: z.boolean() }))
    .mutation(({ ctx, input }) => ctx.services.comments.resolve(ctx.commenter, input.threadId, input.resolved)),
});
