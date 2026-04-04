import { z } from "zod";
import { createTRPCRouter, protectedProcedure, teacherProcedure } from "@/server/api/trpc";
import * as notificationService from "@/server/services/notification.service";

export const notificationRouter = createTRPCRouter({
  // ─── Teacher ──────────────────────────────────────────────────────────────
  sendAnnouncement: teacherProcedure
    .input(z.object({
      courseId: z.string().uuid(),
      title: z.string().min(1).max(200),
      body: z.string().min(1),
    }))
    .mutation(({ ctx, input }) =>
      notificationService.sendAnnouncement(ctx.db, input.courseId, input.title, input.body),
    ),

  sendDeadlineReminder: teacherProcedure
    .input(z.object({
      courseId: z.string().uuid(),
      assessmentId: z.string().uuid(),
      title: z.string(),
      deadline: z.date(),
    }))
    .mutation(({ ctx, input }) =>
      notificationService.sendDeadlineReminder(
        ctx.db, input.courseId, input.assessmentId, input.title, input.deadline,
      ),
    ),

  notifyCourseUpdate: teacherProcedure
    .input(z.object({ courseId: z.string().uuid(), description: z.string() }))
    .mutation(({ ctx, input }) =>
      notificationService.notifyCourseUpdate(ctx.db, input.courseId, input.description),
    ),

  // ─── Student / All ────────────────────────────────────────────────────────
  list: protectedProcedure
    .input(z.object({
      unreadOnly: z.boolean().default(false),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(({ ctx, input }) =>
      notificationService.listNotifications(ctx.db, ctx.session.user.id, input),
    ),

  unreadCount: protectedProcedure
    .query(({ ctx }) => notificationService.getUnreadCount(ctx.db, ctx.session.user.id)),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      notificationService.markNotificationRead(ctx.db, input.notificationId, ctx.session.user.id),
    ),

  markAllRead: protectedProcedure
    .mutation(({ ctx }) =>
      notificationService.markAllNotificationsRead(ctx.db, ctx.session.user.id),
    ),
});