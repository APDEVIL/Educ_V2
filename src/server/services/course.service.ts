import { and, eq, ilike, or } from "drizzle-orm";

import { db } from "@/server/db";
import {
  categories,
  contents,
  courseTags,
  courses,
  lessons,
  modules,
  tags,
} from "@/server/db/schema";

type DB = typeof db;

// ─── Categories & Tags ────────────────────────────────────────────────────────

export async function listCategories(db: DB) {
  return db.query.categories.findMany({ orderBy: (c, { asc }) => [asc(c.name)] });
}

export async function createCategory(db: DB, data: { name: string; slug: string; description?: string }) {
  const [cat] = await db.insert(categories).values(data).returning();
  return cat;
}

export async function upsertTag(db: DB, name: string, slug: string) {
  const existing = await db.query.tags.findFirst({ where: eq(tags.slug, slug) });
  if (existing) return existing;
  const [tag] = await db.insert(tags).values({ name, slug }).returning();
  return tag;
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function createCourse(
  db: DB,
  teacherId: string,
  data: {
    title: string;
    description?: string;
    thumbnailUrl?: string;
    categoryId?: string;
    tagIds?: string[];
  },
) {
  const { tagIds, ...rest } = data;

  const [course] = await db
    .insert(courses)
    .values({ teacherId, ...rest })
    .returning();

  if (!course) throw new Error("Failed to create course");

  if (tagIds?.length) {
    await db.insert(courseTags).values(
      tagIds.map((tagId) => ({ courseId: course.id, tagId })),
    );
  }

  return course;
}

export async function listCourses(
  db: DB,
  opts: {
    search?: string;
    categoryId?: string;
    tagIds?: string[];
    status?: "draft" | "pending" | "approved" | "rejected";
    teacherId?: string;
    isPublished?: boolean;
    limit?: number;
    offset?: number;
  } = {},
) {
  const { search, categoryId, status, teacherId, isPublished, limit = 20, offset = 0 } = opts;

  const conditions = [];
  if (search) conditions.push(ilike(courses.title, `%${search}%`));
  if (categoryId) conditions.push(eq(courses.categoryId, categoryId));
  if (status) conditions.push(eq(courses.status, status));
  if (teacherId) conditions.push(eq(courses.teacherId, teacherId));
  if (isPublished !== undefined) conditions.push(eq(courses.isPublished, isPublished));

  return db.query.courses.findMany({
    where: conditions.length ? and(...conditions) : undefined,
    with: {
      teacher: true,
      category: true,
      courseTags: { with: { tag: true } },
    },
    limit,
    offset,
    orderBy: (c, { desc }) => [desc(c.createdAt)],
  });
}

export async function getCourseById(db: DB, courseId: string) {
  return db.query.courses.findFirst({
    where: eq(courses.id, courseId),
    with: {
      teacher: true,
      category: true,
      modules: {
        orderBy: (m, { asc }) => [asc(m.order)],
        with: {
          lessons: {
            orderBy: (l, { asc }) => [asc(l.order)],
            with: { contents: true },
          },
        },
      },
      assessments: true,
    },
  });
}

export async function updateCourse(
  db: DB,
  courseId: string,
  data: Partial<{
    title: string;
    description: string;
    thumbnailUrl: string;
    categoryId: string;
    isPublished: boolean;
    tagIds: string[];
  }>,
) {
  const { tagIds, ...rest } = data;

  // ✅ When teacher toggles isPublished ON, bump status draft → pending
  // so admin sees it in the review queue. Only bumps from draft, never
  // overrides approved/rejected.
  let statusBump: { status: "pending" } | undefined;
  if (rest.isPublished === true) {
    const current = await db.query.courses.findFirst({
      where: eq(courses.id, courseId),
      columns: { status: true },
    });
    if (current?.status === "draft") {
      statusBump = { status: "pending" };
    }
  }

  const [updated] = await db
    .update(courses)
    .set({ ...rest, ...statusBump, updatedAt: new Date() })
    .where(eq(courses.id, courseId))
    .returning();

  if (tagIds !== undefined) {
    await db.delete(courseTags).where(eq(courseTags.courseId, courseId));
    if (tagIds.length) {
      await db.insert(courseTags).values(
        tagIds.map((tagId) => ({ courseId, tagId })),
      );
    }
  }

  return updated;
}

export async function deleteCourse(db: DB, courseId: string) {
  await db.delete(courses).where(eq(courses.id, courseId));
}

export async function reviewCourse(
  db: DB,
  courseId: string,
  status: "approved" | "rejected",
  rejectionReason?: string,
) {
  const [updated] = await db
    .update(courses)
    .set({
      status,
      rejectionReason: status === "rejected" ? rejectionReason : null,
      isPublished: status === "approved",
      updatedAt: new Date(),
    })
    .where(eq(courses.id, courseId))
    .returning();
  return updated;
}

// ─── Modules ──────────────────────────────────────────────────────────────────

export async function createModule(
  db: DB,
  courseId: string,
  data: { title: string; description?: string; order?: number },
) {
  const [mod] = await db.insert(modules).values({ courseId, ...data }).returning();
  return mod;
}

export async function updateModule(
  db: DB,
  moduleId: string,
  data: Partial<{ title: string; description: string; order: number }>,
) {
  const [updated] = await db
    .update(modules)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(modules.id, moduleId))
    .returning();
  return updated;
}

export async function deleteModule(db: DB, moduleId: string) {
  await db.delete(modules).where(eq(modules.id, moduleId));
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function createLesson(
  db: DB,
  moduleId: string,
  data: { title: string; description?: string; order?: number; durationMinutes?: number },
) {
  const [lesson] = await db.insert(lessons).values({ moduleId, ...data }).returning();
  return lesson;
}

export async function updateLesson(
  db: DB,
  lessonId: string,
  data: Partial<{ title: string; description: string; order: number; durationMinutes: number }>,
) {
  const [updated] = await db
    .update(lessons)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId))
    .returning();
  return updated;
}

export async function deleteLesson(db: DB, lessonId: string) {
  await db.delete(lessons).where(eq(lessons.id, lessonId));
}

// ─── Content (Materials) ──────────────────────────────────────────────────────

export async function addContent(
  db: DB,
  lessonId: string,
  uploadedBy: string,
  data: {
    type: "pdf" | "video" | "doc" | "link";
    title: string;
    url: string;
  },
) {
  const [content] = await db
    .insert(contents)
    .values({ lessonId, uploadedBy, ...data })
    .returning();
  return content;
}

export async function reviewContent(
  db: DB,
  contentId: string,
  reviewedBy: string,
  status: "approved" | "rejected",
  flagReason?: string,
) {
  const [updated] = await db
    .update(contents)
    .set({
      status,
      flagReason: status === "rejected" ? flagReason : null,
      reviewedBy,
      reviewedAt: new Date(),
    })
    .where(eq(contents.id, contentId))
    .returning();
  return updated;
}

export async function flagContent(db: DB, contentId: string, flagReason: string) {
  const [updated] = await db
    .update(contents)
    .set({ status: "flagged", flagReason })
    .where(eq(contents.id, contentId))
    .returning();
  return updated;
}

export async function deleteContent(db: DB, contentId: string) {
  await db.delete(contents).where(eq(contents.id, contentId));
}

export async function listPendingContent(db: DB) {
  return db.query.contents.findMany({
    where: or(
      eq(contents.status, "pending"),
      eq(contents.status, "flagged"),
    ),
    with: { lesson: true },
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });
}