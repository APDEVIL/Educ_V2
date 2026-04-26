"use client";

import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { CourseCard } from "@/components/course/coruse-card";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Compass, ClipboardList, ArrowRight, Star, AlertCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useUser } from "@/lib/auth-client";

export default function StudentDashboardPage() {
  const user = useUser();
  const { data: enrollments, isLoading: enrollLoading } = api.enrollment.myEnrollments.useQuery();
  const { data: submissions, isLoading: subLoading } = api.assessment.mySubmissions.useQuery();
  const { data: recommendations } = api.enrollment.recommendations.useQuery({ limit: 3 });

  const pendingSubmissions = (submissions ?? []).filter(
    (s: any) => s.status === "submitted",
  );
  const gradedRecently = (submissions ?? [])
    .filter((s: any) => s.status === "graded")
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(" ")[0] ?? "there"} 👋`}
        description="Continue where you left off"
        crumbs={[{ label: "Dashboard" }]}
        action={
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link href="/browse">
              <Compass className="h-4 w-4" />
              Browse courses
            </Link>
          </Button>
        }
      />

      {/* Enrolled courses */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">My courses</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
            <Link href="/courses">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
          </Button>
        </div>
        {enrollLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="aspect-[4/3] rounded-xl" />)}
          </div>
        ) : enrollments?.length === 0 ? (
          <div className="rounded-xl border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">You haven't enrolled in any courses yet.</p>
            <Button asChild size="sm" className="mt-3 bg-blue-600 hover:bg-blue-700">
              <Link href="/browse">Browse courses</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(enrollments as any[]).slice(0, 3).map((e) => (
              <CourseCard
                key={e.id}
                id={e.courseId}
                title={e.course?.title ?? ""}
                description={e.course?.description}
                thumbnailUrl={e.course?.thumbnailUrl}
                teacher={e.course?.teacher ?? { name: "Teacher" }}
                category={e.course?.category}
                progressPercent={e.progressPercent}
                variant="enrolled"
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pending assessments */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                Pending submissions
              </h2>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/assessments">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            {subLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : pendingSubmissions.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">All caught up!</p>
            ) : (
              <div className="space-y-2">
                {pendingSubmissions.slice(0, 4).map((s: any) => (
                  <Link
                    key={s.id}
                    href={`/assessments/${s.assessmentId}`}
                    className="flex items-center justify-between rounded-lg border px-3 py-2.5 hover:bg-accent transition-colors"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{s.assessment?.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">{s.assessment?.type}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">Submitted</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent grades */}
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Star className="h-4 w-4 text-blue-500" />
                Recent grades
              </h2>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/grades">View all <ArrowRight className="h-3.5 w-3.5" /></Link>
              </Button>
            </div>
            {subLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}
              </div>
            ) : gradedRecently.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No grades yet</p>
            ) : (
              <div className="space-y-2">
                {gradedRecently.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{s.assessment?.title}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(s.gradedAt)}</span>
                    </div>
                    <span className="text-sm font-bold tabular-nums">
                      {s.points}/{s.assessment?.maxPoints}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      {recommendations && (recommendations as any[]).length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">Recommended for you</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(recommendations as any[]).map((c) => (
              <CourseCard
                key={c.id}
                id={c.id}
                title={c.title}
                description={c.description}
                thumbnailUrl={c.thumbnail_url}
                teacher={{ name: c.teacher_name ?? "Teacher" }}
                variant="browse"
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}