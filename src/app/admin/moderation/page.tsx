"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle2, Trash2, Flag, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

export default function AdminModerationPage() {
  const utils = api.useUtils();

  // Reports
  const { data: openReports, isLoading: reportsLoading } =
    api.interaction.listReports.useQuery({ resolved: false });

  const resolveReport = api.interaction.resolveReport.useMutation({
    onSuccess: () => {
      toast.success("Report resolved");
      void utils.interaction.listReports.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // Flagged content
  const { data: pendingContent, isLoading: contentLoading } =
    api.course.listPendingContent.useQuery();

  const reviewContent = api.course.reviewContent.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.status === "approved" ? "Content approved" : "Content removed");
      void utils.course.listPendingContent.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Moderation"
        description="Review flagged content and user reports"
        crumbs={[{ label: "Admin" }, { label: "Moderation" }]}
      />

      <Tabs defaultValue="reports">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="reports" className="gap-1.5">
            <Flag className="h-3.5 w-3.5" />
            Reports
            {openReports && openReports.length > 0 && (
              <Badge className="ml-1 h-4 rounded-sm px-1 text-[10px]">
                {openReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="content" className="gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            Flagged content
            {pendingContent && pendingContent.length > 0 && (
              <Badge className="ml-1 h-4 rounded-sm px-1 text-[10px]">
                {pendingContent.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Reports ── */}
        <TabsContent value="reports" className="mt-4">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reported by</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-20 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportsLoading
                  ? [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(5)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : openReports?.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No open reports — all clear ✓
                        </TableCell>
                      </TableRow>
                    )
                    : openReports?.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{r.reportedBy}</TableCell>
                          <TableCell className="text-sm">{r.reason}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {r.contentId ? "Content" : r.discussionId ? "Discussion" : "Message"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(r.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 gap-1 text-xs text-green-600"
                              onClick={() => resolveReport.mutate({ reportId: r.id })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Resolve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Flagged content ── */}
        <TabsContent value="content" className="mt-4">
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Flag reason</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contentLoading
                  ? [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        {[...Array(6)].map((_, j) => (
                          <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : pendingContent?.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No flagged content
                        </TableCell>
                      </TableRow>
                    )
                    : pendingContent?.map((c: any) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm font-medium">{c.title}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs uppercase">{c.type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={c.status === "flagged" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                            {c.flagReason ?? "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDate(c.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-green-600"
                                onClick={() =>
                                  reviewContent.mutate({ contentId: c.id, status: "approved" })
                                }
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                                onClick={() =>
                                  reviewContent.mutate({ contentId: c.id, status: "rejected" })
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}