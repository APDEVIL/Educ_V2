import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { userRouter } from "./routers/user.router";
import { courseRouter } from "./routers/course.router";
import { enrollmentRouter } from "./routers/enrollment.router";
import { assessmentRouter } from "./routers/assessment.router";
import { interactionRouter } from "./routers/interaction.router";
import { notificationRouter } from "./routers/notification.router";
import { analyticsRouter } from "./routers/analytics.router";

export const appRouter = createTRPCRouter({
  user: userRouter,
  course: courseRouter,
  enrollment: enrollmentRouter,
  assessment: assessmentRouter,
  interaction: interactionRouter,
  notification: notificationRouter,
  analytics: analyticsRouter,
});

export type AppRouter = typeof appRouter;
export const createCaller = createCallerFactory(appRouter);