"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { QuizPlayer } from "@/components/assessment/quiz-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Upload, Clock, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function TakeAssessmentPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const [fileUrls, setFileUrls] = useState<string[]>([""]);

  const { data: assessment, isLoading } = api.assessment.getById.useQuery({ assessmentId });
  const { data: mySubmission } = api.assessment.mySubmission.useQuery({ assessmentId });

  const submitAssignment = api.assessment.submitAssignment.useMutation({
    onSuccess: () => toast.success("Assignment submitted!"),
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!assessment) return <p className="text-sm text-muted-foreground">Assessment not found</p>;

  const isQuiz = assessment.type === "quiz" || assessment.type === "exam";
  const alreadySubmitted = !!mySubmission;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={assessment.title}
        crumbs={[
          { label: "Assessments", href: "/assessments" },
          { label: assessment.title },
        ]}
      />

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <Badge variant="outline" className="capitalize">{assessment.type}</Badge>
        <span className="flex items-center gap-1">
          <CheckCircle2 className="h-4 w-4" />
          {assessment.maxPoints} points
        </span>
        {assessment.deadline && (
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            Due {formatDate(assessment.deadline)}
          </span>
        )}
      </div>

      {/* Already submitted state */}
      {alreadySubmitted && (
        <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-green-700 dark:text-green-300">
                Already submitted
              </p>
              {(mySubmission as any)?.points !== null && (
                <p className="text-xs text-green-600">
                  Grade: {(mySubmission as any).points}/{assessment.maxPoints}
                  {(mySubmission as any).feedback && ` — ${(mySubmission as any).feedback}`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!alreadySubmitted && (
        <>
          {/* Description */}
          {assessment.description && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {assessment.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Quiz player */}
          {isQuiz && assessment.questions && (
            <QuizPlayer
              assessmentId={assessmentId}
              title={assessment.title}
              questions={assessment.questions as any[]}
            />
          )}

          {/* Assignment submission */}
          {!isQuiz && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Upload className="h-4 w-4" />
                  Submit your work
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="text-xs text-muted-foreground">
                  Paste the URL(s) to your submitted files (Google Drive, GitHub, etc.)
                </p>
                {fileUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <Input
                      placeholder="https://…"
                      value={url}
                      onChange={(e) => {
                        const next = [...fileUrls];
                        next[i] = e.target.value;
                        setFileUrls(next);
                      }}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => setFileUrls((prev) => [...prev, ""])}
                >
                  + Add another file
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!fileUrls.some((u) => u.trim()) || submitAssignment.isPending}
                  onClick={() =>
                    submitAssignment.mutate({
                      assessmentId,
                      fileUrls: fileUrls.filter((u) => u.trim()),
                    })
                  }
                >
                  {submitAssignment.isPending ? "Submitting…" : "Submit assignment"}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}