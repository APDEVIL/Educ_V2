"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Clock, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";

type Question = {
  question: string;
  options: string[];
  points: number;
};

interface QuizPlayerProps {
  assessmentId: string;
  title: string;
  questions: Question[];
  timeLimitMinutes?: number; // optional timer
  onComplete?: () => void;
}

export function QuizPlayer({
  assessmentId,
  title,
  questions,
  timeLimitMinutes,
  onComplete,
}: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(
    timeLimitMinutes ? timeLimitMinutes * 60 : null,
  );

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  const submit = api.assessment.submitQuiz.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("Quiz submitted!");
      onComplete?.();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = useCallback(() => {
    const formattedAnswers = Object.entries(answers).map(([qi, si]) => ({
      questionIndex: Number(qi),
      selectedIndex: si,
    }));
    submit.mutate({ assessmentId, answers: formattedAnswers });
  }, [answers, assessmentId, submit]);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft === null || submitted) return;
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => (s ?? 1) - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, submitted, handleSubmit]);

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h2 className="text-lg font-semibold">Quiz submitted!</h2>
        <p className="text-sm text-muted-foreground">
          You answered {answeredCount} of {questions.length} questions.
        </p>
      </div>
    );
  }

  const current = questions[currentIndex]!;
  const isLast = currentIndex === questions.length - 1;
  const timerWarning = secondsLeft !== null && secondsLeft < 60;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-semibold">{title}</h2>
          <span className="text-xs text-muted-foreground">
            Question {currentIndex + 1} of {questions.length} · {totalPoints} pts total
          </span>
        </div>
        {secondsLeft !== null && (
          <Badge
            variant={timerWarning ? "destructive" : "secondary"}
            className="gap-1 text-sm tabular-nums"
          >
            <Clock className="h-3.5 w-3.5" />
            {formatTime(secondsLeft)}
          </Badge>
        )}
      </div>

      {/* Progress */}
      <Progress value={progress} className="h-1.5" />

      {/* Question */}
      <div className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="mb-5 flex items-start justify-between gap-3">
          <p className="text-sm font-medium leading-relaxed">{current.question}</p>
          <Badge variant="outline" className="shrink-0 text-xs">
            {current.points} pt{current.points !== 1 ? "s" : ""}
          </Badge>
        </div>

        <RadioGroup
          value={answers[currentIndex] !== undefined ? String(answers[currentIndex]) : ""}
          onValueChange={(val) =>
            setAnswers((prev) => ({ ...prev, [currentIndex]: Number(val) }))
          }
          className="space-y-2.5"
        >
          {current.options.map((option, oi) => {
            const isSelected = answers[currentIndex] === oi;
            return (
              <div
                key={oi}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors",
                  isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                    : "hover:bg-accent",
                )}
              >
                <RadioGroupItem value={String(oi)} id={`opt-${oi}`} />
                <Label
                  htmlFor={`opt-${oi}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {option}
                </Label>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <span className="text-xs text-muted-foreground">
          {answeredCount}/{questions.length} answered
        </span>

        {isLast ? (
          <Button
            size="sm"
            className="gap-1 bg-blue-600 hover:bg-blue-700"
            onClick={handleSubmit}
            disabled={submit.isPending}
          >
            {submit.isPending ? "Submitting…" : "Submit quiz"}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Question dots */}
      <div className="flex flex-wrap gap-1.5">
        {questions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={cn(
              "h-7 w-7 rounded-md text-xs font-medium transition-colors",
              i === currentIndex
                ? "bg-blue-600 text-white"
                : answers[i] !== undefined
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}