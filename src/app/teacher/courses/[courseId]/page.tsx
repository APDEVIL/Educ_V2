"use client";

import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { CourseForm } from "@/components/course/course-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
import { Trash2, Users, ClipboardList, BookOpen, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusColors = {
  draft:    "bg-muted text-muted-foreground",
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function TeacherCourseDetailPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = params?.courseId;           // ✅ safe access — useParams can be undefined on first render
  const router = useRouter();
  const utils = api.useUtils();

  // ✅ enabled: !!courseId — prevents query firing when courseId is undefined
  const { data: course, isLoading } = api.course.getById.useQuery(
    { courseId: courseId! },
    { enabled: !!courseId },
  );

  const { data: stats } = api.enrollment.completionStats.useQuery(
    { courseId: courseId! },
    { enabled: !!courseId },
  );

  const deleteCourse = api.course.delete.useMutation({
    onSuccess: () => {
      toast.success("Course deleted");
      void utils.course.myCourses.invalidate();
      router.push("/teacher/courses");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!courseId || isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!course) return <p className="text-sm text-muted-foreground">Course not found</p>;

  const status = (course.status ?? "draft") as keyof typeof statusColors;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={course.title}
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: course.title },
        ]}
        action={
          <div className="flex items-center gap-2">
            {/* Admin approval status */}
            <span className={cn("rounded-md px-2.5 py-1 text-xs font-medium", statusColors[status])}>
              {status}
            </span>
            {/* Teacher publish state — separate field from status */}
            <span
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium",
                course.isPublished
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {course.isPublished
                ? <><Eye className="h-3 w-3" /> Published</>
                : <><EyeOff className="h-3 w-3" /> Unpublished</>}
            </span>
          </div>
        }
      />

      {/* Context banners */}
      {status === "draft" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <strong>Status: Draft</strong> — Toggle <em>Publish course</em> below and save to submit for admin review.
        </div>
      )}
      {status === "rejected" && course.rejectionReason && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <strong>Rejected:</strong> {course.rejectionReason}
        </div>
      )}
      {status === "approved" && !course.isPublished && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          <strong>Approved but unpublished</strong> — Toggle <em>Publish course</em> below and save to make it visible to students.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Edit form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Course settings</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm
              courseId={courseId}
              defaultValues={{
                title: course.title,
                description: course.description ?? "",
                thumbnailUrl: course.thumbnailUrl ?? "",
                categoryId: course.categoryId ?? undefined,
                isPublished: course.isPublished,
              }}
            />
          </CardContent>
        </Card>

        {/* Quick links + stats */}
        <div className="flex flex-col gap-4">
          {/* Stats — camelCase keys matching the fixed enrollment service */}
          {stats && (
            <Card>
              <CardContent className="grid grid-cols-2 gap-4 p-5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xl font-bold">{stats.totalEnrolled}</span>
                  <span className="text-xs text-muted-foreground">Enrolled</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-2xl font-bold">{stats.totalCompleted}</span>
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
                <div className="col-span-2 flex flex-col gap-0.5">
                  <span className="text-2xl font-bold">{stats.avgProgress}%</span>
                  <span className="text-xs text-muted-foreground">Avg progress</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick nav */}
          <Card>
            <CardContent className="flex flex-col gap-1 p-3">
              {[
                { label: "Curriculum",  href: `/teacher/courses/${courseId}/curriculum`,  icon: BookOpen },
                { label: "Students",    href: `/teacher/courses/${courseId}/students`,    icon: Users },
                { label: "Assessments", href: `/teacher/courses/${courseId}/assessments`, icon: ClipboardList },
                { label: "Discussions", href: `/teacher/courses/${courseId}/discussions`, icon: BookOpen },
              ].map((item) => (
                <Button key={item.href} asChild variant="ghost" className="justify-between">
                  <Link href={item.href}>
                    <span className="flex items-center gap-2">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      {item.label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Danger zone */}
          <Card className="border-destructive/30">
            <CardContent className="p-4">
              <p className="mb-3 text-xs font-medium text-destructive">Danger zone</p>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full gap-1.5">
                    <Trash2 className="h-4 w-4" />
                    Delete course
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{course.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the course, all modules, lessons, and student progress. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteCourse.mutate({ courseId })}
                    >
                      Delete forever
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}