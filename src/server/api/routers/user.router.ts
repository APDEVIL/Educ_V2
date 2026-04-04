import { z } from "zod";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "@/server/api/trpc";
import * as userService from "@/server/services/user.service";

export const userRouter = createTRPCRouter({
  // ─── Admin ────────────────────────────────────────────────────────────────
  list: adminProcedure
    .input(z.object({
      search: z.string().optional(),
      role: z.enum(["admin", "teacher", "student"]).optional(),
      banned: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(20),
      offset: z.number().default(0),
    }))
    .query(({ ctx, input }) => userService.listUsers(ctx.db, input)),

  getById: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(({ ctx, input }) => userService.getUserById(ctx.db, input.userId)),

  updateRole: adminProcedure
    .input(z.object({ userId: z.string(), role: z.enum(["admin", "teacher", "student"]) }))
    .mutation(({ ctx, input }) => userService.updateUserRole(ctx.db, input.userId, input.role)),

  toggleBan: adminProcedure
    .input(z.object({ userId: z.string(), banned: z.boolean(), banReason: z.string().optional() }))
    .mutation(({ ctx, input }) =>
      userService.toggleUserBan(ctx.db, input.userId, input.banned, input.banReason),
    ),

  stats: adminProcedure
    .query(({ ctx }) => userService.getUserStats(ctx.db)),

  // ─── Profile (all roles) ──────────────────────────────────────────────────
  getProfile: protectedProcedure
    .query(({ ctx }) => userService.getProfile(ctx.db, ctx.session.user.id)),

  upsertProfile: protectedProcedure
    .input(z.object({
      bio: z.string().max(500).optional(),
      phone: z.string().optional(),
      avatarUrl: z.string().url().optional(),
      expertise: z.string().optional(),
      qualification: z.string().optional(),
      gradeLevel: z.string().optional(),
      name: z.string().min(1).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { name, ...profileData } = input;
      if (name) await userService.updateUserDisplayName(ctx.db, ctx.session.user.id, name);
      return userService.upsertProfile(ctx.db, ctx.session.user.id, profileData);
    }),
});