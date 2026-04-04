import { and, eq, isNull } from "drizzle-orm";

import { type db as DB } from "@/server/db";
import { enrollments, notifications } from "@/server/db/schema";

type DB = typeof DB;

type NotificationType = "announcement" | "deadline" | "grade" | "message" | "course_update";

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createNotification(
  db: DB,
  data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    courseId?: string;
    assessmentId?: string;
  },
) {
  const [notification] = await db.insert(notifications).values(data).returning();
  return notification;
}

// ─── Bulk Dispatch (to all students enrolled in a course) ─────────────────────

export async function notifyCourseStudents(
  db: DB,
  courseId: string,
  data: {
    type: NotificationType;
    title: string;
    body: string;
    assessmentId?: string;
  },
) {
  const courseEnrollments = await db.query.enrollments.findMany({
    where: eq(enrollments.courseId, courseId),
    columns: { studentId: true },
  });

  if (!courseEnrollments.length) return [];

  const rows = courseEnrollments.map((e) => ({
    userId: e.studentId,
    courseId,
    ...data,
  }));

  return db.insert(notifications).values(rows).returning();
}

// ─── Announcement (teacher → all enrolled) ────────────────────────────────────

export async function sendAnnouncement(
  db: DB,
  courseId: string,
  title: string,
  body: string,
) {
  return notifyCourseStudents(db, courseId, {
    type: "announcement",
    title,
    body,
  });
}

// ─── Deadline Reminder (teacher → all enrolled) ───────────────────────────────

export async function sendDeadlineReminder(
  db: DB,
  courseId: string,
  assessmentId: string,
  title: string,
  deadline: Date,
) {
  return notifyCourseStudents(db, courseId, {
    type: "deadline",
    title,
    body: `Deadline: ${deadline.toLocaleDateString()}`,
    assessmentId,
  });
}

// ─── Grade notification (single student) ─────────────────────────────────────

export async function notifyGradeReleased(
  db: DB,
  studentId: string,
  courseId: string,
  assessmentId: string,
  assessmentTitle: string,
) {
  return createNotification(db, {
    userId: studentId,
    type: "grade",
    title: "Grade released",
    body: `Your submission for "${assessmentTitle}" has been graded.`,
    courseId,
    assessmentId,
  });
}

// ─── Course update notification ───────────────────────────────────────────────

export async function notifyCourseUpdate(
  db: DB,
  courseId: string,
  updateDescription: string,
) {
  return notifyCourseStudents(db, courseId, {
    type: "course_update",
    title: "Course updated",
    body: updateDescription,
  });
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function listNotifications(
  db: DB,
  userId: string,
  opts: { unreadOnly?: boolean; limit?: number; offset?: number } = {},
) {
  const { unreadOnly, limit = 20, offset = 0 } = opts;
  return db.query.notifications.findMany({
    where: unreadOnly
      ? and(eq(notifications.userId, userId), isNull(notifications.readAt))
      : eq(notifications.userId, userId),
    orderBy: (n, { desc }) => [desc(n.createdAt)],
    limit,
    offset,
  });
}

export async function markNotificationRead(db: DB, notificationId: string, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.id, notificationId), eq(notifications.userId, userId)),
    );
}

export async function markAllNotificationsRead(db: DB, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function getUnreadCount(db: DB, userId: string) {
  const result = await db.query.notifications.findMany({
    where: and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    columns: { id: true },
  });
  return result.length;
}