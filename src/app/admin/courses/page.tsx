"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, Search, Eye } from "lucide-react";
import { toast } from "sonner";
import { formatDate, truncate } from "@/lib/utils";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Status = "draft" | "pending" | "approved" | "rejected";

const statusColors: Record<Status, string> = {
  draft:    "bg-muted text-muted-foreground",
  pending:  "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export default function AdminCoursesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [rejectTarget, setRejectTarget] = useState<{ id: string; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const utils = api.useUtils();

  const { data: courses, isLoading } = api.course.adminList.useQuery({
    status: status === "all" ? undefined : status,
    limit: 50,
  });

  const review = api.course.review.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Course approved" : "Course rejected");
      setRejectTarget(null);
      setRejectReason("");
      void utils.course.adminList.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const filtered = courses?.filter((c) =>
    search ? c.title.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Courses"
        description="Review and moderate all platform courses"
        crumbs={[{ label: "Admin" }, { label: "Courses" }]}
      />

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search courses…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as Status | "all")}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [...Array(6)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : filtered?.map((course) => {
                  const s = (course.status ?? "draft") as Status;
                  return (
                    <TableRow key={course.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{truncate(course.title, 50)}</span>
                          {course.description && (
                            <span className="text-xs text-muted-foreground">
                              {truncate(course.description, 60)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {course.teacher?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {course.category?.name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "rounded-md px-2 py-0.5 text-[11px] font-medium",
                          statusColors[s],
                        )}>
                          {s}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(course.createdAt)}
                      </TableCell>

                      {/* ✅ Actions — View always visible, approve/reject for pending only */}
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">

                          {/* View button — always shown */}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            asChild
                          >
                            <Link href={`/admin/courses/${course.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>

                          {/* Approve / Reject — pending only */}
                          {s === "pending" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-green-600 hover:text-green-700"
                                onClick={() =>
                                  review.mutate({ courseId: course.id, status: "approved" })
                                }
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() =>
                                  setRejectTarget({ id: course.id, title: course.title })
                                }
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={() => setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject "{rejectTarget?.title}"?</DialogTitle>
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
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || review.isPending}
              onClick={() =>
                rejectTarget &&
                review.mutate({
                  courseId: rejectTarget.id,
                  status: "rejected",
                  rejectionReason: rejectReason,
                })
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