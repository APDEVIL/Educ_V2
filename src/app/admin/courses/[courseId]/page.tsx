"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2, XCircle, BookOpen, Users, FileText, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, cn } from "@/lib/utils";

type Status = "draft" | "pending" | "approved" | "rejected";

const statusColors: Record<Status, string> = {
  draft:    "bg-muted text-muted-foreground",
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = use(params);
  const router = useRouter();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const utils = api.useUtils();

  const { data: course, isLoading } = api.course.getById.useQuery({ courseId });

  const review = api.course.review.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Course approved ✓" : "Course rejected");
      setRejectOpen(false);
      setRejectReason("");
      void utils.course.adminList.invalidate();
      void utils.course.getById.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col gap-4 py-12 items-center text-center">
        <p className="text-muted-foreground">Course not found.</p>
        <Button variant="outline" onClick={() => router.back()}>Go back</Button>
      </div>
    );
  }

  const status = (course.status ?? "draft") as Status;
  const totalLessons = course.modules?.reduce(
    (acc, m) => acc + (m.lessons?.length ?? 0), 0,
  ) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={course.title}
        description={course.description ?? undefined}
        crumbs={[
          { label: "Admin", href: "/admin/dashboard" },
          { label: "Courses", href: "/admin/courses" },
          { label: course.title },
        ]}
        action={
          <div className="flex items-center gap-2">
            {/* Status badge */}
            <span className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium",
              statusColors[status],
            )}>
              {status}
            </span>

            {/* Approve / Reject — pending only */}
            {status === "pending" && (
              <>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ courseId, status: "approved" })}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  disabled={review.isPending}
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Left: course info ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Rejection reason banner */}
          {status === "rejected" && course.rejectionReason && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <span className="font-semibold">Rejection reason: </span>
              {course.rejectionReason}
            </div>
          )}

          {/* Thumbnail */}
          {course.thumbnailUrl && (
            <div className="overflow-hidden rounded-xl border">
              <img
                src={course.thumbnailUrl}
                alt={course.title}
                className="h-56 w-full object-cover"
              />
            </div>
          )}

          {/* Meta */}
          <div className="rounded-xl border p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold">Course info</h2>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Teacher</p>
                <p className="font-medium">{course.teacher?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Category</p>
                <p className="font-medium">{course.category?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Created</p>
                <p className="font-medium">{formatDate(course.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-0.5">Published</p>
                <p className="font-medium">{course.isPublished ? "Yes" : "No"}</p>
              </div>
            </div>
          </div>

          {/* Curriculum preview */}
          <div className="rounded-xl border p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              Curriculum
              <span className="ml-auto text-xs text-muted-foreground font-normal">
                {course.modules?.length ?? 0} modules · {totalLessons} lessons
              </span>
            </h2>
            <Separator />
            {!course.modules?.length ? (
              <p className="text-xs text-muted-foreground">No modules yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {course.modules.map((mod) => (
                  <div key={mod.id}>
                    <p className="text-sm font-medium mb-1">{mod.title}</p>
                    {mod.lessons?.length ? (
                      <ul className="flex flex-col gap-0.5 pl-3">
                        {mod.lessons.map((lesson) => (
                          <li key={lesson.id} className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <FileText className="h-3 w-3 shrink-0" />
                            {lesson.title}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-muted-foreground pl-3">No lessons.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right: stats + assessments ── */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Assessments
            </h2>
            <Separator />
            {!course.assessments?.length ? (
              <p className="text-xs text-muted-foreground">No assessments.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {course.assessments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{a.title}</span>
                    <Badge variant="outline" className="ml-2 text-[10px] shrink-0">
                      {a.type}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border p-4 flex flex-col gap-2">
            <h2 className="text-sm font-semibold mb-1">Quick actions</h2>
            <Separator className="mb-1" />
            {status === "pending" && (
              <>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ courseId, status: "approved" })}
                >
                  <CheckCircle2 className="h-4 w-4" /> Approve course
                </Button>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={review.isPending}
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="h-4 w-4" /> Reject course
                </Button>
              </>
            )}
            {status !== "pending" && (
              <p className="text-xs text-muted-foreground text-center py-2">
                {status === "approved"
                  ? "This course is live."
                  : status === "rejected"
                  ? "This course was rejected."
                  : "This course is still a draft."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject "{course.title}"?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Provide a reason so the teacher knows what to fix.
            </p>
            <Textarea
              placeholder="Rejection reason…"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || review.isPending}
              onClick={() =>
                review.mutate({ courseId, status: "rejected", rejectionReason: rejectReason })
              }
            >
              Reject course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}