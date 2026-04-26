"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import Link from "next/link";
import {
  Trash2, ArrowRight, Users, CheckCircle2, Clock, ClipboardList,
  FileQuestion, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const editSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  maxPoints: z.number().min(1),
  deadline: z.string().optional(),
  isAutoGraded: z.boolean(),
});
type EditValues = z.infer<typeof editSchema>;

const typeIcon = { assignment: ClipboardList, quiz: FileQuestion, exam: GraduationCap };
const statusColors: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  graded:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  returned:  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export default function AssessmentDetailPage() {
  const { courseId, assessmentId } = useParams<{ courseId: string; assessmentId: string }>();
  const router = useRouter();
  const utils = api.useUtils();

  const { data: course } = api.course.getById.useQuery({ courseId });
  const { data: assessment, isLoading } = api.assessment.getById.useQuery({ assessmentId });
  const { data: submissions, isLoading: subLoading } = api.assessment.listSubmissions.useQuery({ assessmentId });

  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    values: {
      title: assessment?.title ?? "",
      description: assessment?.description ?? "",
      maxPoints: assessment?.maxPoints ?? 100,
      deadline: assessment?.deadline
        ? new Date(assessment.deadline).toISOString().slice(0, 16)
        : "",
      isAutoGraded: assessment?.isAutoGraded ?? false,
    },
  });

  const update = api.assessment.update.useMutation({
    onSuccess: () => {
      toast.success("Assessment updated");
      void utils.assessment.getById.invalidate({ assessmentId });
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAssessment = api.assessment.delete.useMutation({
    onSuccess: () => {
      toast.success("Assessment deleted");
      void utils.assessment.listForCourse.invalidate({ courseId });
      router.push(`/teacher/courses/${courseId}/assessments`);
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: EditValues) {
    update.mutate({
      assessmentId,
      title: values.title,
      description: values.description,
      maxPoints: values.maxPoints,
      deadline: values.deadline ? new Date(values.deadline) : undefined,
      isAutoGraded: values.isAutoGraded,
    });
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-80 lg:col-span-2" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (!assessment) return <p className="text-sm text-muted-foreground">Assessment not found</p>;

  const Icon = typeIcon[assessment.type] ?? ClipboardList;
  const gradedCount = (submissions as any[])?.filter((s) => s.status !== "submitted").length ?? 0;
  const totalCount = (submissions as any[])?.length ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={assessment.title}
        crumbs={[
          { label: "Teacher" },
          { label: "Courses", href: "/teacher/courses" },
          { label: course?.title ?? "Course", href: `/teacher/courses/${courseId}` },
          { label: "Assessments", href: `/teacher/courses/${courseId}/assessments` },
          { label: assessment.title },
        ]}
        action={
          <Button asChild size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700">
            <Link href={`/teacher/courses/${courseId}/assessments/${assessmentId}/grade`}>
              <Users className="h-4 w-4" />
              Grade submissions
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Edit form */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Icon className="h-4 w-4" />
              <span className="capitalize">{assessment.type}</span> settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions</FormLabel>
                      <FormControl>
                        <Textarea rows={3} className="resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="maxPoints"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max points</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="deadline"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deadline</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {(assessment.type === "quiz" || assessment.type === "exam") && (
                  <FormField
                    control={form.control}
                    name="isAutoGraded"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-3">
                        <FormLabel className="cursor-pointer">Auto-grade quiz</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={update.isPending}
                >
                  {update.isPending ? "Saving…" : "Save changes"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Stats + danger */}
        <div className="flex flex-col gap-4">
          {/* Submission stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
                  <span className="text-xl font-bold tabular-nums">{totalCount}</span>
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <div className="flex flex-col gap-0.5 rounded-lg bg-muted/50 p-3">
                  <span className="text-xl font-bold tabular-nums">{gradedCount}</span>
                  <span className="text-xs text-muted-foreground">Graded</span>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-1.5 pt-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{assessment.maxPoints} points max</span>
                </div>
                {assessment.deadline && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Due {formatDate(assessment.deadline)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="capitalize">{assessment.type}</span>
                  {assessment.isAutoGraded && (
                    <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                  )}
                </div>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                <Link href={`/teacher/courses/${courseId}/assessments/${assessmentId}/grade`}>
                  Grade submissions
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
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
                    Delete assessment
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{assessment.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently deletes the assessment and all {totalCount} student submission{totalCount !== 1 ? "s" : ""}. Cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteAssessment.mutate({ assessmentId })}
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

      {/* Recent submissions preview */}
      {totalCount > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium">
              Recent submissions
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href={`/teacher/courses/${courseId}/assessments/${assessmentId}/grade`}>
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subLoading
                  ? [...Array(3)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(4)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : (submissions as any[]).slice(0, 5).map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="text-sm font-medium">{s.student?.name}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(s.submittedAt)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.points !== null ? `${s.points}/${assessment.maxPoints}` : "—"}
                        </TableCell>
                        <TableCell>
                          <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusColors[s.status] ?? "bg-muted text-muted-foreground"}`}>
                            {s.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}