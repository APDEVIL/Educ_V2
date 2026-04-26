import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { headers } from "next/headers";

// Make sure your baseURL is set wherever this auth object is exported!
import { db } from "@/server/db";
import { getSession } from "@/server/better-auth/server"; // ✅ use centralized session

// 1. We accept opts.req here as a fallback
export const createTRPCContext = async (opts: { req?: Request; headers?: Headers }) => {
  // keep this (used by RSC caller)
  const nextHeaders = opts.headers ?? (await headers());

  // ✅ FIX: always use centralized session (handles cookies correctly)
  const session = await getSession();

  // DEBUG LOG
  console.log(
    "🔥 SSR Session Check:",
    session ? `FOUND (${session.user.email})` : "NULL"
  );

  // 💡 UPDATE: Explicitly return `headers: nextHeaders` so the resolved headers 
  // actually make it into your tRPC context instead of being unused/discarded.
  return { db, session, headers: nextHeaders, ...opts };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;

const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  if (t._config.isDev) {
    await new Promise((r) =>
      setTimeout(r, Math.floor(Math.random() * 400) + 100)
    );
  }
  const result = await next();
  console.log(`[TRPC] ${path} took ${Date.now() - start}ms`);
  return result;
});

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    return next({
      ctx: {
        ...ctx,
        session: {
          ...ctx.session,
          user: ctx.session.user,
        },
      },
    });
  });

// ─── Role Guards ──────────────────────────────────────────────────────────────

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if ((ctx.session.user as { role?: string }).role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next({ ctx });
});

export const teacherProcedure = protectedProcedure.use(({ ctx, next }) => {
  const role = (ctx.session.user as { role?: string }).role;

  if (!["admin", "teacher"].includes(role ?? "")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Teacher access required",
    });
  }

  return next({ ctx });
});