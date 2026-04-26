import { and, eq, isNull, isNotNull, or } from "drizzle-orm";

import { db } from "@/server/db";
import { discussionReplies, discussions, messages, reports } from "@/server/db/schema";

type DB = typeof db;

// ─── Discussions ──────────────────────────────────────────────────────────────

export async function createDiscussion(
  db: DB,
  createdBy: string,
  data: { courseId: string; title: string; body: string },
) {
  const [discussion] = await db
    .insert(discussions)
    .values({ createdBy, ...data })
    .returning();
  return discussion;
}

export async function listDiscussions(db: DB, courseId: string) {
  return db.query.discussions.findMany({
    where: eq(discussions.courseId, courseId),
    with: {
      author: true,
      replies: {
        with: { author: true }, // ✅ Fixed: authorId is a column, author is the relation
      },
    },
    orderBy: (d, { desc, asc }) => [desc(d.isPinned), asc(d.createdAt)],
  });
}

export async function getDiscussion(db: DB, discussionId: string) {
  return db.query.discussions.findFirst({
    where: eq(discussions.id, discussionId),
    with: {
      author: true,
      replies: {
        with: { author: true }, // ✅ Fixed: was authorId: true
        orderBy: (r, { asc }) => [asc(r.createdAt)],
      },
    },
  });
}

export async function updateDiscussion(
  db: DB,
  discussionId: string,
  data: Partial<{ title: string; body: string; isPinned: boolean; isLocked: boolean }>,
) {
  const [updated] = await db
    .update(discussions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(discussions.id, discussionId))
    .returning();
  return updated;
}

export async function deleteDiscussion(db: DB, discussionId: string) {
  await db.delete(discussions).where(eq(discussions.id, discussionId));
}

// ─── Discussion Replies ───────────────────────────────────────────────────────

export async function addReply(
  db: DB,
  authorId: string,
  data: { discussionId: string; body: string; parentId?: string },
) {
  const discussion = await db.query.discussions.findFirst({
    where: eq(discussions.id, data.discussionId),
  });
  if (discussion?.isLocked) throw new Error("Discussion is locked");

  const [reply] = await db
    .insert(discussionReplies)
    .values({ authorId, ...data })
    .returning();
  return reply;
}

export async function deleteReply(db: DB, replyId: string) {
  await db.delete(discussionReplies).where(eq(discussionReplies.id, replyId));
}

// ─── Direct Messages ──────────────────────────────────────────────────────────

export async function sendMessage(
  db: DB,
  senderId: string,
  data: {
    receiverId: string;
    type: "text" | "file";
    body?: string;
    fileUrl?: string;
    fileName?: string;
  },
) {
  if (data.type === "text" && !data.body) throw new Error("body required for text message");
  if (data.type === "file" && !data.fileUrl) throw new Error("fileUrl required for file message");

  const [message] = await db
    .insert(messages)
    .values({ senderId, ...data })
    .returning();
  return message;
}

export async function getConversation(
  db: DB,
  userA: string,
  userB: string,
  limit = 50,
  offset = 0,
) {
  return db.query.messages.findMany({
    where: or(
      and(eq(messages.senderId, userA), eq(messages.receiverId, userB)),
      and(eq(messages.senderId, userB), eq(messages.receiverId, userA)),
    ),
    with: { sender: true },
    orderBy: (m, { asc }) => [asc(m.createdAt)],
    limit,
    offset,
  });
}

export async function markMessageRead(db: DB, messageId: string) {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(eq(messages.id, messageId));
}

export async function listConversationPartners(db: DB, userId: string) {
  const sent = await db.query.messages.findMany({
    where: eq(messages.senderId, userId),
    columns: { receiverId: true },
  });
  const received = await db.query.messages.findMany({
    where: eq(messages.receiverId, userId),
    columns: { senderId: true },
  });

  const partnerIds = [
    ...new Set([
      ...sent.map((m) => m.receiverId),
      ...received.map((m) => m.senderId),
    ]),
  ].filter((id) => id !== userId);

  return partnerIds;
}

// ─── Reports & Moderation ─────────────────────────────────────────────────────

export async function createReport(
  db: DB,
  reportedBy: string,
  data: {
    reason: string;
    contentId?: string;
    discussionId?: string;
    messageId?: string;
  },
) {
  const [report] = await db
    .insert(reports)
    .values({ reportedBy, ...data })
    .returning();
  return report;
}

export async function listReports(
  db: DB,
  opts: { resolved?: boolean } = {},
) {
  return db.query.reports.findMany({
    where:
      opts.resolved === undefined
        ? undefined
        : opts.resolved
          ? isNotNull(reports.resolvedAt)  // ✅ Fixed: was and() with no args
          : isNull(reports.resolvedAt),    // ✅ Fixed: was eq(reports.resolvedBy, null as never)
    with: {
      content: true,    // ✅ Fixed: was contentId: true (column, not relation)
      discussion: true, // ✅ Fixed: was discussionId: true (column, not relation)
      reporter: true,
      resolver: true,
    },
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

export async function resolveReport(db: DB, reportId: string, resolvedBy: string) {
  const [updated] = await db
    .update(reports)
    .set({ resolvedAt: new Date(), resolvedBy })
    .where(eq(reports.id, reportId))
    .returning();
  return updated;
}