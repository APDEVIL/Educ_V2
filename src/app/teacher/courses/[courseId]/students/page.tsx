"use client";

import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { getInitials, formatDate } from "@/lib/utils";

export default function CourseStudentsPage() {
  const { courseId } = useParams<{ courseId: string }>();

  const { data: course } = api.course.getById.useQuery({ courseId });
  const { data: enrollments, isLoading } = api.enrollment.courseStudents.useQuery({ courseId });
  const { data: performance, isLoading: perfLoading } =
    api.analytics.studentPerformance.useQuery({ courseId });

  const perfMap = new Map(
    ((performance ?? []) as Record<string, unknown>[]).map((r) => [String(r.id), r]),
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Students"
        description={`${enrollments?.length ?? 0} enrolled`}
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: course?.title ?? "Course", href: `/teacher/courses/${courseId}` },
          { label: "Students" },
        ]}
      />

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Avg score</TableHead>
              <TableHead>Enrolled</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || perfLoading
              ? [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(5)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : enrollments?.map((e: any) => {
                  const perf = perfMap.get(e.studentId);
                  const progress = e.progressPercent ?? 0;
                  return (
                    <TableRow key={e.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={e.student?.image ?? ""} />
                            <AvatarFallback className="text-xs">
                              {getInitials(e.student?.name ?? "S")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{e.student?.name}</p>
                            <p className="text-xs text-muted-foreground">{e.student?.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="w-40">
                        <div className="flex flex-col gap-1">
                          <Progress value={progress} className="h-1.5" />
                          <span className="text-[11px] text-muted-foreground">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {perf ? `${perf.avg_score_pct ?? 0}%` : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(e.enrolledAt)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={e.completedAt ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {e.completedAt ? "Completed" : "In progress"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}