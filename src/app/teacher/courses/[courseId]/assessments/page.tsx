"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { AssessmentForm } from "@/components/assessment/assessment-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import { Plus, GraduationCap, ClipboardList, FileQuestion, ArrowRight, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

const typeIcon = { assignment: ClipboardList, quiz: FileQuestion, exam: GraduationCap };

export default function TeacherAssessmentsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const utils = api.useUtils();

  const { data: course } = api.course.getById.useQuery({ courseId });
  const { data: assessments, isLoading } = api.assessment.listForCourse.useQuery({ courseId });

  const deleteAssessment = api.assessment.delete.useMutation({
    onSuccess: () => {
      toast.success("Assessment deleted");
      setDeleteTarget(null);
      void utils.assessment.listForCourse.invalidate({ courseId });
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Assessments"
        description="Manage assignments, quizzes and exams"
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: course?.title ?? "Course", href: `/teacher/courses/${courseId}` },
          { label: "Assessments" },
        ]}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" /> New assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create assessment</DialogTitle>
              </DialogHeader>
              <AssessmentForm courseId={courseId} onSuccess={() => setOpen(false)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Auto-grade</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    {[...Array(6)].map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              : assessments?.length === 0
                ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                      No assessments yet — click "New assessment" to create one
                    </TableCell>
                  </TableRow>
                )
                : assessments?.map((a) => {
                    const Icon = typeIcon[a.type] ?? ClipboardList;
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm font-medium">{a.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-xs capitalize">
                            <Icon className="h-3 w-3" />{a.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{a.maxPoints}</TableCell>
                        <TableCell>
                          <Badge variant={a.isAutoGraded ? "default" : "secondary"} className="text-xs">
                            {a.isAutoGraded ? "Auto" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {a.deadline ? formatDate(a.deadline) : "No deadline"}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                              <Link href={`/teacher/courses/${courseId}/assessments/${a.id}/grade`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ id: a.id, title: a.title })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently deletes this assessment and all student submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteAssessment.mutate({ assessmentId: deleteTarget.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}