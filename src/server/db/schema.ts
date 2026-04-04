import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  real,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum("role", ["admin", "teacher", "student"]);
export const courseStatusEnum = pgEnum("course_status", ["draft", "pending", "approved", "rejected"]);
export const contentTypeEnum = pgEnum("content_type", ["pdf", "video", "doc", "link"]);
export const contentStatusEnum = pgEnum("content_status", ["pending", "approved", "rejected", "flagged"]);
export const submissionStatusEnum = pgEnum("submission_status", ["submitted", "graded", "returned"]);
export const assessmentTypeEnum = pgEnum("assessment_type", ["assignment", "quiz", "exam"]);
export const notificationTypeEnum = pgEnum("notification_type", ["announcement", "deadline", "grade", "message", "course_update"]);
export const messageTypeEnum = pgEnum("message_type", ["text", "file"]);

// ─── Users ────────────────────────────────────────────────────────────────────
// better-auth manages: id, email, name, emailVerified, image, createdAt, updatedAt
// We extend with platform-specific fields via a profile table

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  role: roleEnum("role").notNull().default("student"),
  banned: boolean("banned").notNull().default(false),
  banReason: text("ban_reason"),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const accounts = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verifications = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Profiles ─────────────────────────────────────────────────────────────────
// Extended profile data separate from better-auth's user table

export const profiles = pgTable("profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  bio: text("bio"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  // teacher-specific
  expertise: text("expertise"),
  qualification: text("qualification"),
  // student-specific
  gradeLevel: text("grade_level"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Categories & Tags ────────────────────────────────────────────────────────

export const categories = pgTable("category", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tags = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
});

// ─── Courses ──────────────────────────────────────────────────────────────────

export const courses = pgTable("course", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  teacherId: text("teacher_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  status: courseStatusEnum("status").notNull().default("draft"),
  rejectionReason: text("rejection_reason"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const courseTags = pgTable("course_tag", {
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  tagId: uuid("tag_id").notNull().references(() => tags.id, { onDelete: "cascade" }),
});

// ─── Modules & Lessons ────────────────────────────────────────────────────────

export const modules = pgTable("module", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lessons = pgTable("lesson", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  durationMinutes: integer("duration_minutes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Content (Materials) ──────────────────────────────────────────────────────

export const contents = pgTable("content", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  uploadedBy: text("uploaded_by").notNull().references(() => users.id),
  type: contentTypeEnum("type").notNull(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  status: contentStatusEnum("status").notNull().default("pending"),
  flagReason: text("flag_reason"),
  reviewedBy: text("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Enrollments ──────────────────────────────────────────────────────────────

export const enrollments = pgTable("enrollment", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  enrolledAt: timestamp("enrolled_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  progressPercent: real("progress_percent").notNull().default(0),
});

export const lessonProgress = pgTable("lesson_progress", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: uuid("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

// ─── Assessments (Assignments + Quizzes/Exams) ────────────────────────────────

export const assessments = pgTable("assessment", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => users.id),
  type: assessmentTypeEnum("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  // quiz/exam: questions stored as JSON [{question, options[], correctIndex, points}]
  questions: jsonb("questions"),
  // assignment: max file size, allowed types etc.
  maxPoints: integer("max_points").notNull().default(100),
  isAutoGraded: boolean("is_auto_graded").notNull().default(false),
  deadline: timestamp("deadline"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const submissions = pgTable("submission", {
  id: uuid("id").primaryKey().defaultRandom(),
  assessmentId: uuid("assessment_id").notNull().references(() => assessments.id, { onDelete: "cascade" }),
  studentId: text("student_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // assignment: file URLs; quiz: [{questionId, selectedIndex}]
  content: jsonb("content").notNull(),
  status: submissionStatusEnum("status").notNull().default("submitted"),
  points: real("points"),
  feedback: text("feedback"),
  gradedBy: text("graded_by").references(() => users.id),
  gradedAt: timestamp("graded_at"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
});

// ─── Discussions ──────────────────────────────────────────────────────────────

export const discussions = pgTable("discussion", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  createdBy: text("created_by").notNull().references(() => users.id),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  isLocked: boolean("is_locked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const discussionReplies = pgTable("discussion_reply", {
  id: uuid("id").primaryKey().defaultRandom(),
  discussionId: uuid("discussion_id").notNull().references(() => discussions.id, { onDelete: "cascade" }),
  authorId: text("author_id").notNull().references(() => users.id),
  parentId: uuid("parent_id"), // self-ref for nested replies — no FK to avoid circular
  body: text("body").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Direct Messages ──────────────────────────────────────────────────────────

export const messages = pgTable("message", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderId: text("sender_id").notNull().references(() => users.id),
  receiverId: text("receiver_id").notNull().references(() => users.id),
  type: messageTypeEnum("type").notNull().default("text"),
  body: text("body"),        // for text messages
  fileUrl: text("file_url"), // for file messages
  fileName: text("file_name"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Reports / Flags ──────────────────────────────────────────────────────────

export const reports = pgTable("report", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportedBy: text("reported_by").notNull().references(() => users.id),
  // polymorphic: one of these will be set
  contentId: uuid("content_id").references(() => contents.id, { onDelete: "cascade" }),
  discussionId: uuid("discussion_id").references(() => discussions.id, { onDelete: "cascade" }),
  messageId: uuid("message_id").references(() => messages.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notification", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  // deep-link reference
  courseId: uuid("course_id").references(() => courses.id, { onDelete: "set null" }),
  assessmentId: uuid("assessment_id").references(() => assessments.id, { onDelete: "set null" }),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  taughtCourses: many(courses),
  enrollments: many(enrollments),
  submissions: many(submissions),
  notifications: many(notifications),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  teacher: one(users, { fields: [courses.teacherId], references: [users.id] }),
  category: one(categories, { fields: [courses.categoryId], references: [categories.id] }),
  modules: many(modules),
  enrollments: many(enrollments),
  assessments: many(assessments),
  discussions: many(discussions),
  courseTags: many(courseTags),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  course: one(courses, { fields: [modules.courseId], references: [courses.id] }),
  lessons: many(lessons),
}));

export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  module: one(modules, { fields: [lessons.moduleId], references: [modules.id] }),
  contents: many(contents),
  progress: many(lessonProgress),
}));

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(users, { fields: [enrollments.studentId], references: [users.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const assessmentsRelations = relations(assessments, ({ one, many }) => ({
  course: one(courses, { fields: [assessments.courseId], references: [courses.id] }),
  creator: one(users, { fields: [assessments.createdBy], references: [users.id] }),
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  assessment: one(assessments, { fields: [submissions.assessmentId], references: [assessments.id] }),
  student: one(users, { fields: [submissions.studentId], references: [users.id] }),
}));

export const discussionsRelations = relations(discussions, ({ one, many }) => ({
  course: one(courses, { fields: [discussions.courseId], references: [courses.id] }),
  author: one(users, { fields: [discussions.createdBy], references: [users.id] }),
  replies: many(discussionReplies),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, { fields: [messages.senderId], references: [users.id], relationName: "sender" }),
  receiver: one(users, { fields: [messages.receiverId], references: [users.id], relationName: "receiver" }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  course: one(courses, { fields: [notifications.courseId], references: [courses.id] }),
}));