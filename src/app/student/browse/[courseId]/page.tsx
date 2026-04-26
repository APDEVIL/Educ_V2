"use client";

import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { BookOpen, Clock, Users, ChevronDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { getInitials } from "@/lib/utils";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const utils = api.useUtils();

  const { data: course, isLoading } = api.course.getById.useQuery({ courseId });
  const { data: enrollments } = api.enrollment.myEnrollments.useQuery();

  const isEnrolled = (enrollments as any[])?.some((e: any) => e.courseId === courseId);

  const enroll = api.enrollment.enroll.useMutation({
    onSuccess: () => {
      toast.success("Enrolled successfully!");
      void utils.enrollment.myEnrollments.invalidate();
      router.push(`/learn/${courseId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const [expandedModule, setExpandedModule] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!course) return <p className="text-sm text-muted-foreground">Course not found</p>;

  const totalLessons = course.modules?.reduce(
    (sum: number, m: any) => sum + (m.lessons?.length ?? 0), 0,
  ) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={course.title}
        crumbs={[{ label: "Browse", href: "/browse" }, { label: course.title }]}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left — details */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          {/* Thumbnail */}
          {course.thumbnailUrl && (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
              <Image src={course.thumbnailUrl} alt={course.title} fill className="object-cover" />
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {course.category && (
              <Badge variant="secondary">{course.category.name}</Badge>
            )}
            <span className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              {course.modules?.length ?? 0} modules
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {totalLessons} lessons
            </span>
          </div>

          {/* Description */}
          {course.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{course.description}</p>
          )}

          <Separator />

          {/* Teacher */}
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={course.teacher?.image ?? ""} />
              <AvatarFallback>{getInitials(course.teacher?.name ?? "T")}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{course.teacher?.name}</p>
              <p className="text-xs text-muted-foreground">Instructor</p>
            </div>
          </div>

          <Separator />

          {/* Curriculum preview */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Curriculum</h2>
            {course.modules?.map((mod: any) => (
              <div key={mod.id} className="rounded-lg border">
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                  onClick={() => setExpandedModule(expandedModule === mod.id ? null : mod.id)}
                >
                  <span className="text-sm font-medium">{mod.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {mod.lessons?.length ?? 0} lessons
                    </span>
                    <ChevronDown
                      className={cn("h-4 w-4 text-muted-foreground transition-transform",
                        expandedModule === mod.id && "rotate-180")}
                    />
                  </div>
                </button>
                {expandedModule === mod.id && mod.lessons?.length > 0 && (
                  <div className="border-t px-4 py-2 space-y-1">
                    {mod.lessons.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-2 py-1.5 text-sm text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5 shrink-0" />
                        {l.title}
                        {l.durationMinutes && (
                          <span className="ml-auto text-xs">{l.durationMinutes}m</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right — enroll CTA */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex flex-col gap-1">
                <p className="text-lg font-bold">Free</p>
                <p className="text-xs text-muted-foreground">Full access to all lessons</p>
              </div>

              {isEnrolled ? (
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => router.push(`/learn/${courseId}`)}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Continue learning
                </Button>
              ) : (
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={enroll.isPending}
                  onClick={() => enroll.mutate({ courseId })}
                >
                  {enroll.isPending ? "Enrolling…" : "Enroll now"}
                </Button>
              )}

              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  {course.modules?.length ?? 0} modules · {totalLessons} lessons
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Assignments & quizzes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  Certificate on completion
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}