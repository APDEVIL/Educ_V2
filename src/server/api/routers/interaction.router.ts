import { z } from "zod";
import { createTRPCRouter, protectedProcedure, teacherProcedure, adminProcedure } from "@/server/api/trpc";
import * as interactionService from "@/server/services/interaction.service";

export const interactionRouter = createTRPCRouter({
  // ─── Discussions ──────────────────────────────────────────────────────────
  createDiscussion: protectedProcedure
    .input(z.object({
      courseId: z.string().uuid(),
      title: z.string().min(1).max(200),
      body: z.string().min(1),
    }))
    .mutation(({ ctx, input }) =>
      interactionService.createDiscussion(ctx.db, ctx.session.user.id, input),
    ),

  listDiscussions: protectedProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) => interactionService.listDiscussions(ctx.db, input.courseId)),

  getDiscussion: protectedProcedure
    .input(z.object({ discussionId: z.string().uuid() }))
    .query(({ ctx, input }) => interactionService.getDiscussion(ctx.db, input.discussionId)),

  updateDiscussion: teacherProcedure
    .input(z.object({
      discussionId: z.string().uuid(),
      isPinned: z.boolean().optional(),
      isLocked: z.boolean().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { discussionId, ...data } = input;
      return interactionService.updateDiscussion(ctx.db, discussionId, data);
    }),

  deleteDiscussion: teacherProcedure
    .input(z.object({ discussionId: z.string().uuid() }))
    .mutation(({ ctx, input }) => interactionService.deleteDiscussion(ctx.db, input.discussionId)),

  // ─── Replies ──────────────────────────────────────────────────────────────
  addReply: protectedProcedure
    .input(z.object({
      discussionId: z.string().uuid(),
      body: z.string().min(1),
      parentId: z.string().uuid().optional(),
    }))
    .mutation(({ ctx, input }) =>
      interactionService.addReply(ctx.db, ctx.session.user.id, input),
    ),

  deleteReply: protectedProcedure
    .input(z.object({ replyId: z.string().uuid() }))
    .mutation(({ ctx, input }) => interactionService.deleteReply(ctx.db, input.replyId)),

  // ─── Direct Messages ──────────────────────────────────────────────────────
  sendMessage: protectedProcedure
    .input(z.object({
      receiverId: z.string(),
      type: z.enum(["text", "file"]),
      body: z.string().optional(),
      fileUrl: z.string().url().optional(),
      fileName: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      interactionService.sendMessage(ctx.db, ctx.session.user.id, input),
    ),

  getConversation: protectedProcedure
    .input(z.object({
      partnerId: z.string(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(({ ctx, input }) =>
      interactionService.getConversation(
        ctx.db, ctx.session.user.id, input.partnerId, input.limit, input.offset,
      ),
    ),

  markMessageRead: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(({ ctx, input }) => interactionService.markMessageRead(ctx.db, input.messageId)),

  conversationPartners: protectedProcedure
    .query(({ ctx }) =>
      interactionService.listConversationPartners(ctx.db, ctx.session.user.id),
    ),

  // ─── Reports ──────────────────────────────────────────────────────────────
  report: protectedProcedure
    .input(z.object({
      reason: z.string().min(1),
      contentId: z.string().uuid().optional(),
      discussionId: z.string().uuid().optional(),
      messageId: z.string().uuid().optional(),
    }))
    .mutation(({ ctx, input }) =>
      interactionService.createReport(ctx.db, ctx.session.user.id, input),
    ),

  listReports: adminProcedure
    .input(z.object({ resolved: z.boolean().optional() }))
    .query(({ ctx, input }) => interactionService.listReports(ctx.db, input)),

  resolveReport: adminProcedure
    .input(z.object({ reportId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      interactionService.resolveReport(ctx.db, input.reportId, ctx.session.user.id),
    ),
});