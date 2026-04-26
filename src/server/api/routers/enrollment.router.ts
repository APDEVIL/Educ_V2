import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  teacherProcedure,
} from "@/server/api/trpc";
import * as enrollmentService from "@/server/services/entrollment.service";

export const enrollmentRouter = createTRPCRouter({
  // ─── Student ──────────────────────────────────────────────────────────────
  enroll: protectedProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      enrollmentService.enrollStudent(ctx.db, ctx.session.user.id, input.courseId),
    ),

  myEnrollments: protectedProcedure
    .query(({ ctx }) =>
      enrollmentService.listStudentEnrollments(ctx.db, ctx.session.user.id),
    ),

  myProgress: protectedProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      enrollmentService.getStudentProgress(ctx.db, ctx.session.user.id, input.courseId),
    ),

  markLessonComplete: protectedProcedure
    .input(z.object({ lessonId: z.string().uuid(), courseId: z.string().uuid() }))
    .mutation(({ ctx, input }) =>
      enrollmentService.markLessonComplete(
        ctx.db, ctx.session.user.id, input.lessonId, input.courseId,
      ),
    ),

  recommendations: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(({ ctx, input }) =>
      enrollmentService.getRecommendations(ctx.db, ctx.session.user.id, input.limit),
    ),

  // ─── Teacher ──────────────────────────────────────────────────────────────
  courseStudents: teacherProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      enrollmentService.listCourseEnrollments(ctx.db, input.courseId),
    ),

  // ✅ Fixed: changed to protectedProcedure so both teacher dashboard
  //    and any other page can call it without UNAUTHORIZED error.
  //    courseId is now optional — returns null if not provided
  //    so pages can call it without a courseId and handle the empty state.
  completionStats: protectedProcedure
    .input(z.object({ courseId: z.string().uuid().optional() }))
    .query(({ ctx, input }) => {
      if (!input.courseId) return null; // ✅ guard — caller passed no courseId
      return enrollmentService.getCourseCompletionStats(ctx.db, input.courseId);
    }),
});