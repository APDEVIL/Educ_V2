"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, Circle, ChevronDown, ChevronRight,
  FileText, Video, Link2, File, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const contentIcons = {
  pdf: FileText, video: Video, link: Link2, doc: File,
};

export default function LearnPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [activeLesson, setActiveLesson] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const utils = api.useUtils();
  const { data: course, isLoading } = api.course.getById.useQuery({ courseId });
  const { data: progressData } = api.enrollment.myProgress.useQuery({ courseId });

  const completedLessonIds = new Set(
    (progressData?.completedLessons ?? []).map((l: any) => l.lessonId),
  );
  const progressPercent = progressData?.enrollment?.progressPercent ?? 0;

  const markComplete = api.enrollment.markLessonComplete.useMutation({
    onSuccess: () => void utils.enrollment.myProgress.invalidate({ courseId }),
    onError: (err) => toast.error(err.message),
  });

  function toggleModule(id: string) {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Find active lesson data
  const activeContent = course?.modules
    ?.flatMap((m: any) => m.lessons)
    ?.find((l: any) => l.id === activeLesson);

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-72 shrink-0 flex-col border-r">
        {/* Course header */}
        <div className="border-b p-4">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <p className="text-sm font-semibold leading-snug">{course?.title}</p>
          )}
          <div className="mt-2 flex flex-col gap-1">
            <Progress value={progressPercent} className="h-1.5" />
            <span className="text-[11px] text-muted-foreground">
              {Math.round(progressPercent)}% complete
            </span>
          </div>
        </div>

        {/* Module / lesson tree */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : (
            <div className="p-2">
              {course?.modules?.map((mod: any) => {
                const isOpen = expandedModules.has(mod.id);
                return (
                  <div key={mod.id}>
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-accent"
                    >
                      {isOpen
                        ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                      <span className="flex-1 text-xs font-medium">{mod.title}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {mod.lessons?.filter((l: any) => completedLessonIds.has(l.id)).length}/
                        {mod.lessons?.length ?? 0}
                      </span>
                    </button>

                    {isOpen && mod.lessons?.map((lesson: any) => {
                      const done = completedLessonIds.has(lesson.id);
                      const active = activeLesson === lesson.id;
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setActiveLesson(lesson.id)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-lg py-2 pl-9 pr-3 text-left text-xs transition-colors hover:bg-accent",
                            active && "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
                          )}
                        >
                          {done
                            ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                            : <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />}
                          <span className="flex-1 leading-snug">{lesson.title}</span>
                          {lesson.durationMinutes && (
                            <span className="text-[10px] text-muted-foreground">
                              {lesson.durationMinutes}m
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </aside>

      {/* Content area */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {!activeLesson ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Select a lesson from the sidebar to start learning
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 p-6">
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-lg font-semibold">{activeContent?.title}</h1>
              {!completedLessonIds.has(activeLesson) && (
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5 bg-blue-600 hover:bg-blue-700"
                  disabled={markComplete.isPending}
                  onClick={() =>
                    markComplete.mutate({ lessonId: activeLesson, courseId })
                  }
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark complete
                </Button>
              )}
              {completedLessonIds.has(activeLesson) && (
                <Badge className="gap-1 bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Completed
                </Badge>
              )}
            </div>

            {/* Content list */}
            {activeContent?.contents?.length === 0 && (
              <p className="text-sm text-muted-foreground">No materials yet for this lesson.</p>
            )}
            {activeContent?.contents?.map((c: any) => {
              const Icon = contentIcons[c.type as keyof typeof contentIcons] ?? File;
              return (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{c.title}</span>
                    <span className="text-xs uppercase text-muted-foreground">{c.type}</span>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}