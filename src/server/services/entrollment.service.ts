import { and, eq, sql } from "drizzle-orm";

import { type db as DB } from "@/server/db";
import { enrollments, lessonProgress, lessons, modules, courses } from "@/server/db/schema";

type DB = typeof DB;

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
  // Idempotent — don't double-record
  const existing = await db.query.lessonProgress.findFirst({
    where: and(
      eq(lessonProgress.studentId, studentId),
      eq(lessonProgress.lessonId, lessonId),
    ),
  });
  if (!existing) {
    await db.insert(lessonProgress).values({ studentId, lessonId });
  }

  // Recalculate progress %
  await recalculateProgress(db, studentId, courseId);
}

async function recalculateProgress(db: DB, studentId: string, courseId: string) {
  // Total lessons in course
  const totalResult = await db.execute(sql`
    SELECT COUNT(l.id) AS total
    FROM lesson l
    JOIN module m ON l.module_id = m.id
    WHERE m.course_id = ${courseId}
  `);
  const total = Number(totalResult[0]?.total ?? 0);
  if (total === 0) return;

  // Completed lessons by this student
  const completedResult = await db.execute(sql`
    SELECT COUNT(lp.id) AS completed
    FROM lesson_progress lp
    JOIN lesson l ON lp.lesson_id = l.id
    JOIN module m ON l.module_id = m.id
    WHERE m.course_id = ${courseId}
      AND lp.student_id = ${studentId}
  `);
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
    with: { lessonId: true },
  });

  return { enrollment, completedLessons };
}

// ─── Completion Stats (for analytics) ────────────────────────────────────────

export async function getCourseCompletionStats(db: DB, courseId: string) {
  const result = await db.execute(sql`
    SELECT
      COUNT(*) AS total_enrolled,
      COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS total_completed,
      ROUND(AVG(progress_percent), 1) AS avg_progress
    FROM enrollment
    WHERE course_id = ${courseId}
  `);
  return result[0];
}

// ─── Recommendations (simple: courses in same category not yet enrolled) ──────

export async function getRecommendations(db: DB, studentId: string, limit = 5) {
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