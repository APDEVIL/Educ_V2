import { z } from "zod";
import { createTRPCRouter, protectedProcedure, teacherProcedure } from "@/server/api/trpc";
import * as assessmentService from "@/server/services/assessment.service";

const quizQuestionSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).min(2),
  correctIndex: z.number(),
  points: z.number().default(1),
});

export const assessmentRouter = createTRPCRouter({
  // ─── Teacher ──────────────────────────────────────────────────────────────
  create: teacherProcedure
    .input(z.object({
      courseId: z.string().uuid(),
      type: z.enum(["assignment", "quiz", "exam"]),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      maxPoints: z.number().default(100),
      deadline: z.date().optional(),
      questions: z.array(quizQuestionSchema).optional(),
      isAutoGraded: z.boolean().optional(),
    }))
    .mutation(({ ctx, input }) =>
      assessmentService.createAssessment(ctx.db, ctx.session.user.id, input),
    ),

  update: teacherProcedure
    .input(z.object({
      assessmentId: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      maxPoints: z.number().optional(),
      deadline: z.date().optional(),
      questions: z.array(quizQuestionSchema).optional(),
      isAutoGraded: z.boolean().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { assessmentId, ...data } = input;
      return assessmentService.updateAssessment(ctx.db, assessmentId, data);
    }),

  delete: teacherProcedure
    .input(z.object({ assessmentId: z.string().uuid() }))
    .mutation(({ ctx, input }) => assessmentService.deleteAssessment(ctx.db, input.assessmentId)),

  listSubmissions: teacherProcedure
    .input(z.object({
      assessmentId: z.string().uuid(),
      status: z.enum(["submitted", "graded", "returned"]).optional(),
    }))
    .query(({ ctx, input }) =>
      assessmentService.listSubmissions(ctx.db, input.assessmentId, { status: input.status }),
    ),

  grade: teacherProcedure
    .input(z.object({
      submissionId: z.string().uuid(),
      points: z.number(),
      feedback: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      assessmentService.gradeSubmission(ctx.db, input.submissionId, ctx.session.user.id, {
        points: input.points,
        feedback: input.feedback,
      }),
    ),

  returnSubmission: teacherProcedure
    .input(z.object({ submissionId: z.string().uuid(), feedback: z.string() }))
    .mutation(({ ctx, input }) =>
      assessmentService.returnSubmission(ctx.db, input.submissionId, input.feedback),
    ),

  // ─── Student ──────────────────────────────────────────────────────────────
  listForCourse: protectedProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      assessmentService.listCourseAssessments(ctx.db, input.courseId),
    ),

  getById: protectedProcedure
    .input(z.object({ assessmentId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      assessmentService.getAssessmentById(ctx.db, input.assessmentId),
    ),

  submitAssignment: protectedProcedure
    .input(z.object({
      assessmentId: z.string().uuid(),
      fileUrls: z.array(z.string().url()).min(1),
    }))
    .mutation(({ ctx, input }) =>
      assessmentService.submitAssignment(
        ctx.db, ctx.session.user.id, input.assessmentId, input.fileUrls,
      ),
    ),

  submitQuiz: protectedProcedure
    .input(z.object({
      assessmentId: z.string().uuid(),
      answers: z.array(z.object({ questionIndex: z.number(), selectedIndex: z.number() })),
    }))
    .mutation(({ ctx, input }) =>
      assessmentService.submitQuiz(
        ctx.db, ctx.session.user.id, input.assessmentId, input.answers,
      ),
    ),

  mySubmission: protectedProcedure
    .input(z.object({ assessmentId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      assessmentService.getStudentSubmission(ctx.db, ctx.session.user.id, input.assessmentId),
    ),

  mySubmissions: protectedProcedure
    .query(({ ctx }) => assessmentService.listStudentSubmissions(ctx.db, ctx.session.user.id)),

  myGrades: protectedProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) =>
      assessmentService.getStudentGrades(ctx.db, ctx.session.user.id, input.courseId),
    ),
});