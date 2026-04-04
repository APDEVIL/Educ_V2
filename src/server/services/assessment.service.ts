import { and, eq, sql } from "drizzle-orm";

import { type db as DB } from "@/server/db";
import { assessments, submissions } from "@/server/db/schema";

type DB = typeof DB;

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  points: number;
};

type QuizAnswer = {
  questionIndex: number;
  selectedIndex: number;
};

// ─── Assessments (Teacher) ────────────────────────────────────────────────────

export async function createAssessment(
  db: DB,
  createdBy: string,
  data: {
    courseId: string;
    type: "assignment" | "quiz" | "exam";
    title: string;
    description?: string;
    maxPoints?: number;
    deadline?: Date;
    // quiz/exam only
    questions?: QuizQuestion[];
    isAutoGraded?: boolean;
  },
) {
  const { questions, ...rest } = data;
  const [assessment] = await db
    .insert(assessments)
    .values({
      createdBy,
      questions: questions ?? null,
      isAutoGraded: data.type !== "assignment" && (data.isAutoGraded ?? true),
      ...rest,
    })
    .returning();
  return assessment;
}

export async function listCourseAssessments(db: DB, courseId: string) {
  return db.query.assessments.findMany({
    where: eq(assessments.courseId, courseId),
    with: { creator: true },
    orderBy: (a, { asc }) => [asc(a.deadline)],
  });
}

export async function getAssessmentById(db: DB, assessmentId: string) {
  return db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
    with: { submissions: { with: { student: true } } },
  });
}

export async function updateAssessment(
  db: DB,
  assessmentId: string,
  data: Partial<{
    title: string;
    description: string;
    maxPoints: number;
    deadline: Date;
    questions: QuizQuestion[];
    isAutoGraded: boolean;
  }>,
) {
  const { questions, ...rest } = data;
  const [updated] = await db
    .update(assessments)
    .set({ ...rest, ...(questions !== undefined ? { questions } : {}), updatedAt: new Date() })
    .where(eq(assessments.id, assessmentId))
    .returning();
  return updated;
}

export async function deleteAssessment(db: DB, assessmentId: string) {
  await db.delete(assessments).where(eq(assessments.id, assessmentId));
}

// ─── Submissions (Student) ────────────────────────────────────────────────────

export async function submitAssignment(
  db: DB,
  studentId: string,
  assessmentId: string,
  fileUrls: string[], // uploaded file URLs
) {
  // Prevent re-submission
  const existing = await db.query.submissions.findFirst({
    where: and(
      eq(submissions.studentId, studentId),
      eq(submissions.assessmentId, assessmentId),
    ),
  });
  if (existing) throw new Error("Already submitted");

  const [submission] = await db
    .insert(submissions)
    .values({
      studentId,
      assessmentId,
      content: { fileUrls },
    })
    .returning();
  return submission;
}

export async function submitQuiz(
  db: DB,
  studentId: string,
  assessmentId: string,
  answers: QuizAnswer[],
) {
  const existing = await db.query.submissions.findFirst({
    where: and(
      eq(submissions.studentId, studentId),
      eq(submissions.assessmentId, assessmentId),
    ),
  });
  if (existing) throw new Error("Already submitted");

  // Auto-grade
  const assessment = await db.query.assessments.findFirst({
    where: eq(assessments.id, assessmentId),
  });

  let points = 0;
  if (assessment?.isAutoGraded && assessment.questions) {
    const questions = assessment.questions as QuizQuestion[];
    for (const answer of answers) {
      const q = questions[answer.questionIndex];
      if (q && answer.selectedIndex === q.correctIndex) {
        points += q.points;
      }
    }
  }

  const [submission] = await db
    .insert(submissions)
    .values({
      studentId,
      assessmentId,
      content: { answers },
      status: assessment?.isAutoGraded ? "graded" : "submitted",
      points: assessment?.isAutoGraded ? points : null,
    })
    .returning();
  return submission;
}

export async function listSubmissions(
  db: DB,
  assessmentId: string,
  opts: { status?: "submitted" | "graded" | "returned" } = {},
) {
  return db.query.submissions.findMany({
    where: opts.status
      ? and(eq(submissions.assessmentId, assessmentId), eq(submissions.status, opts.status))
      : eq(submissions.assessmentId, assessmentId),
    with: { student: true },
    orderBy: (s, { desc }) => [desc(s.submittedAt)],
  });
}

export async function getStudentSubmission(
  db: DB,
  studentId: string,
  assessmentId: string,
) {
  return db.query.submissions.findFirst({
    where: and(
      eq(submissions.studentId, studentId),
      eq(submissions.assessmentId, assessmentId),
    ),
    with: { assessment: true },
  });
}

export async function listStudentSubmissions(db: DB, studentId: string) {
  return db.query.submissions.findMany({
    where: eq(submissions.studentId, studentId),
    with: { assessment: true },
    orderBy: (s, { desc }) => [desc(s.submittedAt)],
  });
}

// ─── Grading (Teacher / Manual) ───────────────────────────────────────────────

export async function gradeSubmission(
  db: DB,
  submissionId: string,
  gradedBy: string,
  data: {
    points: number;
    feedback?: string;
  },
) {
  const [updated] = await db
    .update(submissions)
    .set({
      points: data.points,
      feedback: data.feedback,
      gradedBy,
      gradedAt: new Date(),
      status: "graded",
    })
    .where(eq(submissions.id, submissionId))
    .returning();
  return updated;
}

export async function returnSubmission(db: DB, submissionId: string, feedback: string) {
  const [updated] = await db
    .update(submissions)
    .set({ feedback, status: "returned" })
    .where(eq(submissions.id, submissionId))
    .returning();
  return updated;
}

// ─── Grade Overview (Student) ─────────────────────────────────────────────────

export async function getStudentGrades(db: DB, studentId: string, courseId: string) {
  const result = await db.execute(sql`
    SELECT
      a.id, a.title, a.type, a.max_points, a.deadline,
      s.points, s.feedback, s.status, s.submitted_at, s.graded_at
    FROM assessment a
    LEFT JOIN submission s
      ON s.assessment_id = a.id AND s.student_id = ${studentId}
    WHERE a.course_id = ${courseId}
    ORDER BY a.deadline ASC NULLS LAST
  `);
  return result;
}