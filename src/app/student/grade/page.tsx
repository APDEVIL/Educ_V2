"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Star, MessageSquare, ClipboardList, FileQuestion, GraduationCap } from "lucide-react";
import { formatDate } from "@/lib/utils";

const typeIcon = {
  assignment: ClipboardList, quiz: FileQuestion, exam: GraduationCap,
};

export default function GradesPage() {
  const { data: enrollments } = api.enrollment.myEnrollments.useQuery();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const activeCourseId = selectedCourseId ?? (enrollments as any[])?.[0]?.courseId;

  const { data: grades, isLoading } = api.assessment.myGrades.useQuery(
    { courseId: activeCourseId! },
    { enabled: !!activeCourseId },
  );

  const gradeRows = (grades ?? []) as Record<string, unknown>[];
  const gradedRows = gradeRows.filter((r) => r.points !== null);
  const totalPoints = gradedRows.reduce((s, r) => s + Number(r.points ?? 0), 0);
  const maxPoints = gradedRows.reduce((s, r) => s + Number(r.max_points ?? 0), 0);
  const avgPct = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Grades"
        description="Your assessment results and feedback"
        crumbs={[{ label: "Grades" }]}
      />

      {/* Course selector */}
      {(enrollments as any[])?.length > 0 && (
        <Select
          value={activeCourseId ?? ""}
          onValueChange={(v) => setSelectedCourseId(v)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {(enrollments as any[]).map((e) => (
              <SelectItem key={e.courseId} value={e.courseId}>
                {e.course?.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Summary */}
      {avgPct !== null && (
        <Card>
          <CardContent className="flex items-center gap-6 p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950">
              <Star className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <p className="text-sm text-muted-foreground">Overall average</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold">{avgPct}%</span>
                <Progress value={avgPct} className="h-2 flex-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                {totalPoints} / {maxPoints} points across {gradedRows.length} graded assessment{gradedRows.length !== 1 ? "s" : ""}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grades list */}
      <div className="flex flex-col gap-3">
        {isLoading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : gradeRows.length === 0
            ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No assessments for this course yet
              </p>
            )
            : gradeRows.map((r, i) => {
                const Icon = typeIcon[String(r.type) as keyof typeof typeIcon] ?? ClipboardList;
                const pct = r.max_points && r.points !== null
                  ? Math.round((Number(r.points) / Number(r.max_points)) * 100)
                  : null;
                const isPassed = pct !== null && pct >= 60;

                return (
                  <Card key={i}>
                    <CardContent className="flex flex-col gap-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{String(r.title)}</p>
                            <p className="text-xs capitalize text-muted-foreground">{String(r.type)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {pct !== null && (
                            <Badge
                              className={isPassed
                                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"}
                            >
                              {pct}%
                            </Badge>
                          )}
                          {r.points !== null ? (
                            <span className="text-sm font-bold tabular-nums">
                              {String(r.points)}/{String(r.max_points)}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-xs">Not submitted</Badge>
                          )}
                        </div>
                      </div>

                      {pct !== null && (
                        <Progress
                          value={pct}
                          className={`h-1.5 ${isPassed ? "" : "[&>div]:bg-red-500"}`}
                        />
                      )}

                      {!!r.feedback && (
                        <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
                          <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{String(r.feedback)}</p>
                        </div>
                      )}

                      {!!r.graded_at && (
                        <p className="text-[11px] text-muted-foreground">
                          Graded {formatDate(r.graded_at as string | Date)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
      </div>
    </div>
  );
}