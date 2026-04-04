import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
  teacherProcedure,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import * as courseService from "@/server/services/course.service";

const contentTypeEnum = z.enum(["pdf", "video", "doc", "link"]);

export const courseRouter = createTRPCRouter({
  // ─── Public / Student ─────────────────────────────────────────────────────
  list: publicProcedure
    .input(z.object({
      search: z.string().optional(),
      categoryId: z.string().uuid().optional(),
      tagIds: z.array(z.string().uuid()).optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().default(0),
    }))
    .query(({ ctx, input }) =>
      courseService.listCourses(ctx.db, { ...input, status: "approved", isPublished: true }),
    ),

  getById: publicProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .query(({ ctx, input }) => courseService.getCourseById(ctx.db, input.courseId)),

  listCategories: publicProcedure
    .query(({ ctx }) => courseService.listCategories(ctx.db)),

  // ─── Teacher ──────────────────────────────────────────────────────────────
  myCourses: teacherProcedure
    .query(({ ctx }) =>
      courseService.listCourses(ctx.db, { teacherId: ctx.session.user.id }),
    ),

  create: teacherProcedure
    .input(z.object({
      title: z.string().min(3).max(200),
      description: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
      categoryId: z.string().uuid().optional(),
      tagIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(({ ctx, input }) =>
      courseService.createCourse(ctx.db, ctx.session.user.id, input),
    ),

  update: teacherProcedure
    .input(z.object({
      courseId: z.string().uuid(),
      title: z.string().min(3).max(200).optional(),
      description: z.string().optional(),
      thumbnailUrl: z.string().url().optional(),
      categoryId: z.string().uuid().optional(),
      isPublished: z.boolean().optional(),
      tagIds: z.array(z.string().uuid()).optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { courseId, ...data } = input;
      return courseService.updateCourse(ctx.db, courseId, data);
    }),

  delete: teacherProcedure
    .input(z.object({ courseId: z.string().uuid() }))
    .mutation(({ ctx, input }) => courseService.deleteCourse(ctx.db, input.courseId)),

  // ─── Modules ──────────────────────────────────────────────────────────────
  createModule: teacherProcedure
    .input(z.object({
      courseId: z.string().uuid(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      order: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { courseId, ...data } = input;
      return courseService.createModule(ctx.db, courseId, data);
    }),

  updateModule: teacherProcedure
    .input(z.object({
      moduleId: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      order: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { moduleId, ...data } = input;
      return courseService.updateModule(ctx.db, moduleId, data);
    }),

  deleteModule: teacherProcedure
    .input(z.object({ moduleId: z.string().uuid() }))
    .mutation(({ ctx, input }) => courseService.deleteModule(ctx.db, input.moduleId)),

  // ─── Lessons ──────────────────────────────────────────────────────────────
  createLesson: teacherProcedure
    .input(z.object({
      moduleId: z.string().uuid(),
      title: z.string().min(1).max(200),
      description: z.string().optional(),
      order: z.number().optional(),
      durationMinutes: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { moduleId, ...data } = input;
      return courseService.createLesson(ctx.db, moduleId, data);
    }),

  updateLesson: teacherProcedure
    .input(z.object({
      lessonId: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      order: z.number().optional(),
      durationMinutes: z.number().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const { lessonId, ...data } = input;
      return courseService.updateLesson(ctx.db, lessonId, data);
    }),

  deleteLesson: teacherProcedure
    .input(z.object({ lessonId: z.string().uuid() }))
    .mutation(({ ctx, input }) => courseService.deleteLesson(ctx.db, input.lessonId)),

  // ─── Content ──────────────────────────────────────────────────────────────
  addContent: teacherProcedure
    .input(z.object({
      lessonId: z.string().uuid(),
      type: contentTypeEnum,
      title: z.string().min(1),
      url: z.string().url(),
    }))
    .mutation(({ ctx, input }) => {
      const { lessonId, ...data } = input;
      return courseService.addContent(ctx.db, lessonId, ctx.session.user.id, data);
    }),

  deleteContent: teacherProcedure
    .input(z.object({ contentId: z.string().uuid() }))
    .mutation(({ ctx, input }) => courseService.deleteContent(ctx.db, input.contentId)),

  // ─── Admin ────────────────────────────────────────────────────────────────
  adminList: adminProcedure
    .input(z.object({
      status: z.enum(["draft", "pending", "approved", "rejected"]).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(({ ctx, input }) => courseService.listCourses(ctx.db, input)),

  review: adminProcedure
    .input(z.object({
      courseId: z.string().uuid(),
      status: z.enum(["approved", "rejected"]),
      rejectionReason: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      courseService.reviewCourse(ctx.db, input.courseId, input.status, input.rejectionReason),
    ),

  reviewContent: adminProcedure
    .input(z.object({
      contentId: z.string().uuid(),
      status: z.enum(["approved", "rejected"]),
      flagReason: z.string().optional(),
    }))
    .mutation(({ ctx, input }) =>
      courseService.reviewContent(ctx.db, input.contentId, ctx.session.user.id, input.status, input.flagReason),
    ),

  listPendingContent: adminProcedure
    .query(({ ctx }) => courseService.listPendingContent(ctx.db)),

  createCategory: adminProcedure
    .input(z.object({ name: z.string(), slug: z.string(), description: z.string().optional() }))
    .mutation(({ ctx, input }) => courseService.createCategory(ctx.db, input)),
});