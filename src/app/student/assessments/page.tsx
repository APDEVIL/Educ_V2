"use client";

import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { ClipboardList, FileQuestion, GraduationCap, ArrowRight, Clock } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useState } from "react";

const typeIcon = {
  assignment: ClipboardList,
  quiz: FileQuestion,
  exam: GraduationCap,
};

const statusColors: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  graded:    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  returned:  "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
};

export default function StudentAssessmentsPage() {
  const [tab, setTab] = useState<"all" | "pending" | "graded">("all");
  const { data: submissions, isLoading } = api.assessment.mySubmissions.useQuery();

  const filtered = (submissions as any[] ?? []).filter((s) => {
    if (tab === "pending") return s.status === "submitted";
    if (tab === "graded") return ["graded", "returned"].includes(s.status);
    return true;
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Assessments"
        description="Your assignments and quizzes"
        crumbs={[{ label: "Assessments" }]}
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="pending">Awaiting grade</TabsTrigger>
          <TabsTrigger value="graded">Graded</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {isLoading
          ? [...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : filtered.length === 0
            ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {tab === "all" ? "No submissions yet" : "Nothing here"}
              </p>
            )
            : filtered.map((s: any) => {
                const Icon = typeIcon[s.assessment?.type as keyof typeof typeIcon] ?? ClipboardList;
                return (
                  <div key={s.id} className="flex items-center gap-4 rounded-xl border p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-1 flex-col gap-0.5">
                      <p className="text-sm font-medium">{s.assessment?.title}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{s.assessment?.type}</span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatDate(s.submittedAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.points !== null && s.assessment?.maxPoints && (
                        <span className="text-sm font-bold tabular-nums">
                          {s.points}/{s.assessment.maxPoints}
                        </span>
                      )}
                      <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${statusColors[s.status] ?? "bg-muted text-muted-foreground"}`}>
                        {s.status}
                      </span>
                    </div>
                  </div>
                );
              })}
      </div>
    </div>
  );
}