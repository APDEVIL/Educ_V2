import { z } from "zod";
import { createTRPCRouter, adminProcedure, teacherProcedure } from "@/server/api/trpc";
import * as analyticsService from "@/server/services/analytics.service";

export const analyticsRouter = createTRPCRouter({
  // ─── Admin ────────────────────────────────────────────────────────────────
  platformStats: adminProcedure
    .query(({ ctx }) => analyticsService.getPlatformStats(ctx.db)),

  coursePerformance: adminProcedure
    .input(z.object({ limit: z.number().default(20) }))
    .query(({ ctx, input }) => analyticsService.getCoursePerformanceReport(ctx.db, input.limit)),

  engagement: adminProcedure
    .query(({ ctx }) => analyticsService.getEngagementReport(ctx.db)),

  exportEnrollments: adminProcedure
    .input(z.object({ courseId: z.string().uuid().optional() }))
    .query(({ ctx, input }) => analyticsService.exportEnrollmentsCSV(ctx.db, input.courseId)),

  // ─── Teacher ──────────────────────────────────────────────────────────────
  teacherReport: teacherProcedure
    .query(({ ctx }) => analyticsService.getTeacherReport(ctx.db, ctx.session.user.id)),

  studentPerformance: teacherProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      analyticsService.getStudentPerformanceReport(ctx.db, input.courseId),
    ),

  exportSubmissions: teacherProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) => analyticsService.exportSubmissionsCSV(ctx.db, input.courseId)),
});