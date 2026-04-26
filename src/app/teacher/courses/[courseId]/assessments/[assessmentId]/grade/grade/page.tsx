"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { GradeForm } from "@/components/assessment/grade-form";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { getInitials, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ClipboardList } from "lucide-react";

type StatusFilter = "all" | "submitted" | "graded" | "returned";

const statusColors: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  graded:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  returned:  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export default function GradePage() {
  const { courseId, assessmentId } = useParams<{ courseId: string; assessmentId: string }>();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<string | null>(null);

  const { data: course } = api.course.getById.useQuery({ courseId });
  const { data: assessment } = api.assessment.getById.useQuery({ assessmentId });
  const { data: submissions, isLoading } = api.assessment.listSubmissions.useQuery({
    assessmentId,
    status: filter === "all" ? undefined : filter,
  });

  const selectedSub = (submissions as any[])?.find((s) => s.id === selected);

  const pendingCount = (submissions as any[] ?? []).filter((s) => s.status === "submitted").length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={assessment?.title ?? "Grade submissions"}
        description={`${(submissions as any[])?.length ?? 0} submissions · ${pendingCount} pending`}
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: course?.title ?? "Course", href: `/teacher/courses/${courseId}` },
          { label: "Assessments", href: `/teacher/courses/${courseId}/assessments` },
          { label: "Grade" },
        ]}
      />

      {/* Summary bar */}
      {assessment && (submissions as any[])?.length > 0 && (
        <div className="flex items-center gap-4 rounded-xl border bg-muted/30 px-4 py-3">
          <ClipboardList className="h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Graded</span>
              <span>
                {(submissions as any[]).filter((s) => s.status !== "submitted").length} /
                {(submissions as any[]).length}
              </span>
            </div>
            <Progress
              value={
                ((submissions as any[]).filter((s) => s.status !== "submitted").length /
                  (submissions as any[]).length) * 100
              }
              className="h-1.5"
            />
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as StatusFilter)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="submitted">
            Pending
            {pendingCount > 0 && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="graded">Graded</TabsTrigger>
          <TabsTrigger value="returned">Returned</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Submission rows */}
      <div className="flex flex-col gap-2">
        {isLoading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : (submissions as any[])?.length === 0
            ? (
              <div className="flex flex-col items-center gap-2 py-16 text-center">
                <p className="text-sm font-medium">No submissions</p>
                <p className="text-xs text-muted-foreground">
                  {filter === "all"
                    ? "Students haven't submitted yet"
                    : `No ${filter} submissions`}
                </p>
              </div>
            )
            : (submissions as any[]).map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setSelected(sub.id)}
                  className={cn(
                    "flex items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-accent",
                    selected === sub.id && "border-blue-500 bg-blue-50 dark:bg-blue-950/40",
                  )}
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={sub.student?.image ?? ""} />
                    <AvatarFallback className="text-xs">
                      {getInitials(sub.student?.name ?? "S")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <p className="truncate text-sm font-medium">{sub.student?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {formatDate(sub.submittedAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {sub.points !== null && (
                      <span className="text-sm font-bold tabular-nums">
                        {sub.points}/{assessment?.maxPoints}
                      </span>
                    )}
                    <span className={cn(
                      "rounded-md px-2 py-0.5 text-[11px] font-medium",
                      statusColors[sub.status] ?? "bg-muted text-muted-foreground",
                    )}>
                      {sub.status}
                    </span>
                  </div>
                </button>
              ))}
      </div>

      {/* Grade side sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="mb-5">
            <SheetTitle>Grade submission</SheetTitle>
          </SheetHeader>
          {selectedSub && (
            <GradeForm
              submissionId={selectedSub.id}
              studentName={selectedSub.student?.name ?? "Student"}
              submittedAt={selectedSub.submittedAt}
              maxPoints={assessment?.maxPoints ?? 100}
              currentPoints={selectedSub.points}
              currentFeedback={selectedSub.feedback}
              status={selectedSub.status}
              content={selectedSub.content ?? {}}
              onSuccess={() => setSelected(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}