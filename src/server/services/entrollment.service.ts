import { and, eq, count, avg } from "drizzle-orm";

import { db } from "@/server/db";
import {
  enrollments,
  lessonProgress,
  lessons,
  modules,
} from "@/server/db/schema";

type DB = typeof db;

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function enrollStudent(db: DB, studentId: string, courseId: string) {
  const existing = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.courseId, courseId),
    ),
  });
  if (existing) return existing;

  const [enrollment] = await db
    .insert(enrollments)
    .values({ studentId, courseId })
    .returning();
  return enrollment;
}

export async function getEnrollment(db: DB, studentId: string, courseId: string) {
  return db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.courseId, courseId),
    ),
    with: { course: true },
  });
}

export async function listStudentEnrollments(db: DB, studentId: string) {
  return db.query.enrollments.findMany({
    where: eq(enrollments.studentId, studentId),
    with: {
      course: {
        with: { teacher: true, category: true },
      },
    },
    orderBy: (e, { desc }) => [desc(e.enrolledAt)],
  });
}

export async function listCourseEnrollments(db: DB, courseId: string) {
  return db.query.enrollments.findMany({
    where: eq(enrollments.courseId, courseId),
    with: { student: true },
    orderBy: (e, { desc }) => [desc(e.enrolledAt)],
  });
}

// ─── Progress Tracking ────────────────────────────────────────────────────────

export async function markLessonComplete(
  db: DB,
  studentId: string,
  lessonId: string,
  courseId: string,
) {
  const existing = await db.query.lessonProgress.findFirst({
    where: and(
      eq(lessonProgress.studentId, studentId),
      eq(lessonProgress.lessonId, lessonId),
    ),
  });
  if (!existing) {
    await db.insert(lessonProgress).values({ studentId, lessonId });
  }

  await recalculateProgress(db, studentId, courseId);
}

async function recalculateProgress(db: DB, studentId: string, courseId: string) {
  // ✅ Drizzle ORM join — no raw SQL, no table name typos
  const totalResult = await db
    .select({ total: count() })
    .from(lessons)
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(eq(modules.courseId, courseId));

  const total = Number(totalResult[0]?.total ?? 0);
  if (total === 0) return;

  const completedResult = await db
    .select({ completed: count() })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
    .innerJoin(modules, eq(lessons.moduleId, modules.id))
    .where(
      and(
        eq(modules.courseId, courseId),
        eq(lessonProgress.studentId, studentId),
      ),
    );

  const completed = Number(completedResult[0]?.completed ?? 0);
  const progressPercent = (completed / total) * 100;

  await db
    .update(enrollments)
    .set({
      progressPercent,
      completedAt: progressPercent >= 100 ? new Date() : null,
    })
    .where(
      and(
        eq(enrollments.studentId, studentId),
        eq(enrollments.courseId, courseId),
      ),
    );
}

export async function getStudentProgress(db: DB, studentId: string, courseId: string) {
  const enrollment = await db.query.enrollments.findFirst({
    where: and(
      eq(enrollments.studentId, studentId),
      eq(enrollments.courseId, courseId),
    ),
  });

  const completedLessons = await db.query.lessonProgress.findMany({
    where: eq(lessonProgress.studentId, studentId),
    with: { lesson: true },
  });

  return { enrollment, completedLessons };
}

// ─── Completion Stats ─────────────────────────────────────────────────────────

export async function getCourseCompletionStats(db: DB, courseId: string) {
  // ✅ Drizzle ORM — no raw SQL FILTER clause, works across all drivers
  const result = await db
    .select({
      totalEnrolled: count(),
      totalCompleted: count(enrollments.completedAt),
      avgProgress: avg(enrollments.progressPercent),
    })
    .from(enrollments)
    .where(eq(enrollments.courseId, courseId));

  const row = result[0];
  return {
    totalEnrolled: Number(row?.totalEnrolled ?? 0),
    totalCompleted: Number(row?.totalCompleted ?? 0),
    avgProgress: Number(Number(row?.avgProgress ?? 0).toFixed(1)),
  };
}

// ─── Recommendations ──────────────────────────────────────────────────────────

export async function getRecommendations(db: DB, studentId: string, limit = 5) {
  // Raw SQL kept here intentionally — complex correlated subquery
  // has no clean Drizzle ORM equivalent without sacrificing readability
  const { sql } = await import("drizzle-orm");

  const result = await db.execute(sql`
    SELECT c.*
    FROM course c
    WHERE c.status = 'approved'
      AND c.is_published = true
      AND c.id NOT IN (
        SELECT e.course_id FROM enrollment e WHERE e.student_id = ${studentId}
      )
      AND c.category_id IN (
        SELECT DISTINCT co.category_id
        FROM enrollment e
        JOIN course co ON e.course_id = co.id
        WHERE e.student_id = ${studentId}
          AND co.category_id IS NOT NULL
      )
    ORDER BY (
      SELECT COUNT(*) FROM enrollment WHERE course_id = c.id
    ) DESC
    LIMIT ${limit}
  `);
  return result;
}