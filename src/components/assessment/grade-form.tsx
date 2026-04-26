"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { formatDateTime } from "@/lib/utils";
import { FileText, ExternalLink } from "lucide-react";

const schema = z.object({
  points: z.number().min(0, "Cannot be negative"),
  feedback: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface GradeFormProps {
  submissionId: string;
  studentName: string;
  submittedAt: Date | string;
  maxPoints: number;
  currentPoints?: number | null;
  currentFeedback?: string | null;
  status: string;
  // assignment: file URLs; quiz: answers array
  content: { fileUrls?: string[]; answers?: { questionIndex: number; selectedIndex: number }[] };
  onSuccess?: () => void;
}

export function GradeForm({
  submissionId,
  studentName,
  submittedAt,
  maxPoints,
  currentPoints,
  currentFeedback,
  status,
  content,
  onSuccess,
}: GradeFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema.refine((v) => v.points <= maxPoints, {
      message: `Cannot exceed ${maxPoints} points`,
      path: ["points"],
    })),
    defaultValues: {
      points: currentPoints ?? 0,
      feedback: currentFeedback ?? "",
    },
  });

  const utils = api.useUtils();

  const grade = api.assessment.grade.useMutation({
    onSuccess: () => {
      toast.success("Graded successfully");
      void utils.assessment.listSubmissions.invalidate();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const ret = api.assessment.returnSubmission.useMutation({
    onSuccess: () => {
      toast.success("Submission returned with feedback");
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message),
  });

  function onSubmit(values: FormValues) {
    grade.mutate({
      submissionId,
      points: values.points,
      feedback: values.feedback,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Student info */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{studentName}</p>
          <p className="text-xs text-muted-foreground">
            Submitted {formatDateTime(submittedAt)}
          </p>
        </div>
        <Badge
          variant={
            status === "graded" ? "default" :
            status === "returned" ? "secondary" :
            "outline"
          }
        >
          {status}
        </Badge>
      </div>

      <Separator />

      {/* Submission content */}
      {content.fileUrls && content.fileUrls.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Submitted files</p>
          {content.fileUrls.map((url, i) => (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-accent"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">File {i + 1}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          ))}
        </div>
      )}

      <Separator />

      {/* Grade form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="points"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Points{" "}
                  <span className="font-normal text-muted-foreground">
                    (max {maxPoints})
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={maxPoints}
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
            name="feedback"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Feedback</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Write feedback for the student..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={grade.isPending}
            >
              {grade.isPending ? "Saving…" : "Save grade"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={ret.isPending || !form.getValues("feedback")}
              onClick={() =>
                ret.mutate({
                  submissionId,
                  feedback: form.getValues("feedback") ?? "",
                })
              }
            >
              Return
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}