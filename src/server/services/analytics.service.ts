import { sql } from "drizzle-orm";

import { db } from "@/server/db";

type DB = typeof db;

// ─── Platform Overview (Admin) ────────────────────────────────────────────────

export async function getPlatformStats(db: DB) {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*) FROM "user" WHERE role = 'student')                          AS total_students,
      (SELECT COUNT(*) FROM "user" WHERE role = 'teacher')                          AS total_teachers,
      (SELECT COUNT(*) FROM course WHERE status = 'approved')                       AS total_courses,
      (SELECT COUNT(*) FROM enrollment)                                             AS total_enrollments,
      (SELECT COUNT(*) FROM enrollment WHERE completed_at IS NOT NULL)              AS total_completions,
      (SELECT COUNT(*) FROM submission)                                             AS total_submissions,
      (SELECT COUNT(*) FROM "user" WHERE created_at > NOW() - INTERVAL '30 days')  AS new_users_30d,
      (SELECT COUNT(*) FROM enrollment WHERE enrolled_at > NOW() - INTERVAL '30 days') AS new_enrollments_30d
  `);
  return result[0];
}

// ─── Course Performance ───────────────────────────────────────────────────────

export async function getCoursePerformanceReport(db: DB, limit = 20) {
  const result = await db.execute(sql`
    SELECT
      c.id,
      c.title,
      u.name                                          AS teacher_name,
      COUNT(DISTINCT e.id)                            AS enrolled_count,
      COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.id END) AS completed_count,
      ROUND(AVG(e.progress_percent)::numeric, 1)      AS avg_progress,
      ROUND(
        COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.id END)::numeric
        / NULLIF(COUNT(DISTINCT e.id), 0) * 100, 1
      )                                               AS completion_rate_pct
    FROM course c
    JOIN "user" u ON c.teacher_id = u.id
    LEFT JOIN enrollment e ON e.course_id = c.id
    WHERE c.status = 'approved'
    GROUP BY c.id, c.title, u.name
    ORDER BY enrolled_count DESC
    LIMIT ${limit}
  `);
  return result;
}

// ─── Student Performance (Admin / Teacher) ────────────────────────────────────

export async function getStudentPerformanceReport(db: DB, courseId: string) {
  const result = await db.execute(sql`
    SELECT
      u.id,
      u.name,
      u.email,
      e.progress_percent,
      e.enrolled_at,
      e.completed_at,
      COUNT(s.id)                                                        AS total_submissions,
      ROUND(AVG(s.points / NULLIF(a.max_points, 0) * 100)::numeric, 1)  AS avg_score_pct
    FROM enrollment e
    JOIN "user" u ON e.student_id = u.id
    LEFT JOIN submission s ON s.student_id = u.id
    LEFT JOIN assessment a ON s.assessment_id = a.id AND a.course_id = ${courseId}
    WHERE e.course_id = ${courseId}
    GROUP BY u.id, u.name, u.email, e.progress_percent, e.enrolled_at, e.completed_at
    ORDER BY e.progress_percent DESC
  `);
  return result;
}

// ─── Teacher Report ───────────────────────────────────────────────────────────

export async function getTeacherReport(db: DB, teacherId: string) {
  const result = await db.execute(sql`
    SELECT
      c.id,
      c.title,
      c.status,
      c.created_at,
      COUNT(DISTINCT e.id)                                                              AS enrolled,
      COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.id END)               AS completed,
      COUNT(DISTINCT a.id)                                                              AS assessment_count,
      COUNT(DISTINCT s.id)                                                              AS submission_count,
      COUNT(DISTINCT CASE WHEN s.status = 'submitted' THEN s.id END)                   AS pending_grades
    FROM course c
    LEFT JOIN enrollment e  ON e.course_id     = c.id
    LEFT JOIN assessment a  ON a.course_id     = c.id
    LEFT JOIN submission s  ON s.assessment_id = a.id
    WHERE c.teacher_id = ${teacherId}
    GROUP BY c.id, c.title, c.status, c.created_at
    ORDER BY c.created_at DESC
  `);
  return result;
}

// ─── Engagement / Traffic (30-day daily breakdown) ────────────────────────────

export async function getEngagementReport(db: DB) {
  const result = await db.execute(sql`
    SELECT
      DATE(enrolled_at) AS date,
      COUNT(*)          AS new_enrollments
    FROM enrollment
    WHERE enrolled_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(enrolled_at)
    ORDER BY date ASC
  `);
  return result;
}

// ─── Export helpers ───────────────────────────────────────────────────────────

export async function exportEnrollmentsCSV(db: DB, courseId?: string) {
  const whereClause = courseId
    ? sql`WHERE e.course_id = ${courseId}`
    : sql``;

  const result = await db.execute(sql`
    SELECT
      u.name,
      u.email,
      c.title                           AS course,
      e.enrolled_at,
      e.completed_at,
      ROUND(e.progress_percent::numeric, 1) AS progress_pct
    FROM enrollment e
    JOIN "user"  u ON e.student_id = u.id
    JOIN course  c ON e.course_id  = c.id
    ${whereClause}
    ORDER BY e.enrolled_at DESC
  `);
  return result;
}

export async function exportSubmissionsCSV(db: DB, courseId: string) {
  const result = await db.execute(sql`
    SELECT
      u.name        AS student,
      a.title       AS assessment,
      a.type,
      s.status,
      s.points,
      a.max_points,
      s.submitted_at,
      s.graded_at,
      s.feedback
    FROM submission s
    JOIN "user"      u ON s.student_id    = u.id
    JOIN assessment  a ON s.assessment_id = a.id
    WHERE a.course_id = ${courseId}
    ORDER BY s.submitted_at DESC
  `);
  return result;
}