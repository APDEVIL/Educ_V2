"use client";

import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import {
  BookOpen, ClipboardList, Users, TrendingUp,
  AlertCircle, Plus, ArrowRight,
} from "lucide-react";
import { formatDate, truncate } from "@/lib/utils";

function StatCard({
  label, value, icon: Icon, className,
}: {
  label: string; value: number; icon: React.ElementType; className?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${className}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TeacherDashboardPage() {
  const { data: report, isLoading } = api.analytics.teacherReport.useQuery();

  const rows = (report ?? []) as Record<string, unknown>[];

  const totalEnrolled = rows.reduce((s, r) => s + Number(r.enrolled ?? 0), 0);
  const totalPendingGrades = rows.reduce((s, r) => s + Number(r.pending_grades ?? 0), 0);
  const totalAssessments = rows.reduce((s, r) => s + Number(r.assessment_count ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Your teaching overview"
        crumbs={[{ label: "Teacher" }, { label: "Dashboard" }]}
        action={
          <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Link href="/teacher/courses/new">
              <Plus className="h-4 w-4" />
              New course
            </Link>
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (
            <>
              <StatCard label="My courses"      value={rows.length}           icon={BookOpen}      className="bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
              <StatCard label="Total enrolled"  value={totalEnrolled}          icon={Users}         className="bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400" />
              <StatCard label="Assessments"     value={totalAssessments}       icon={ClipboardList} className="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
              <StatCard label="Pending grades"  value={totalPendingGrades}     icon={AlertCircle}   className="bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400" />
            </>
          )}
      </div>

      {/* Courses table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">My courses</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href="/teacher/courses">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading
            ? [...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
            : rows.length === 0
              ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <BookOpen className="h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No courses yet</p>
                  <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                    <Link href="/teacher/courses/new">Create your first course</Link>
                  </Button>
                </div>
              )
              : rows.slice(0, 5).map((r) => {
                  const status = String(r.status ?? "draft") as "draft" | "pending" | "approved" | "rejected";
                  const statusColors = {
                    draft: "bg-muted text-muted-foreground",
                    pending: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
                    rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
                  };
                  return (
                    <Link
                      key={String(r.id)}
                      href={`/teacher/courses/${r.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{truncate(String(r.title), 50)}</span>
                        <span className="text-xs text-muted-foreground">
                          {String(r.enrolled ?? 0)} enrolled · {String(r.pending_grades ?? 0)} to grade
                        </span>
                      </div>
                      <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${statusColors[status]}`}>
                        {status}
                      </span>
                    </Link>
                  );
                })}
        </CardContent>
      </Card>
    </div>
  );
}