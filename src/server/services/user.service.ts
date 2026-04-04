import { and, eq, ilike, or, sql } from "drizzle-orm";
import { type z } from "zod";

import { type db as DB } from "@/server/db";
import {
  profiles,
  users,
  type roleEnum,
} from "@/server/db/schema";

type DB = typeof DB;
type Role = (typeof roleEnum.enumValues)[number];

// ─── User Management (Admin) ──────────────────────────────────────────────────

export async function listUsers(
  db: DB,
  opts: {
    search?: string;
    role?: Role;
    banned?: boolean;
    limit?: number;
    offset?: number;
  },
) {
  const { search, role, banned, limit = 20, offset = 0 } = opts;

  const conditions = [];
  if (role) conditions.push(eq(users.role, role));
  if (banned !== undefined) conditions.push(eq(users.banned, banned));
  if (search) {
    conditions.push(
      or(
        ilike(users.name, `%${search}%`),
        ilike(users.email, `%${search}%`),
      ),
    );
  }

  return db.query.users.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: { profile: true },
    limit,
    offset,
    orderBy: (u, { desc }) => [desc(u.createdAt)],
  });
}

export async function getUserById(db: DB, userId: string) {
  return db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { profile: true, enrollments: true, taughtCourses: true },
  });
}

export async function updateUserRole(db: DB, userId: string, role: Role) {
  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function toggleUserBan(
  db: DB,
  userId: string,
  banned: boolean,
  banReason?: string,
) {
  const [updated] = await db
    .update(users)
    .set({ banned, banReason: banned ? banReason : null, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}

export async function getUserStats(db: DB) {
  const result = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE role = 'student') AS students,
      COUNT(*) FILTER (WHERE role = 'teacher') AS teachers,
      COUNT(*) FILTER (WHERE role = 'admin')   AS admins,
      COUNT(*) FILTER (WHERE banned = true)    AS banned
    FROM "user"
  `);
  return result[0];
}

// ─── Profile (all roles) ──────────────────────────────────────────────────────

export async function getProfile(db: DB, userId: string) {
  return db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });
}

export async function upsertProfile(
  db: DB,
  userId: string,
  data: {
    bio?: string;
    phone?: string;
    avatarUrl?: string;
    expertise?: string;
    qualification?: string;
    gradeLevel?: string;
  },
) {
  // Also update display name/image on user if passed via caller
  const existing = await db.query.profiles.findFirst({
    where: eq(profiles.userId, userId),
  });

  if (existing) {
    const [updated] = await db
      .update(profiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(profiles.userId, userId))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(profiles)
    .values({ userId, ...data })
    .returning();
  return created;
}

export async function updateUserDisplayName(
  db: DB,
  userId: string,
  name: string,
) {
  const [updated] = await db
    .update(users)
    .set({ name, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}