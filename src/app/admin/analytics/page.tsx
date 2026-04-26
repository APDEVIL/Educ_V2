"use client";

import { api } from "@/trpc/react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from "recharts";
import { Download, TrendingUp } from "lucide-react";
import { toast } from "sonner";

// ─── Course performance table ─────────────────────────────────────────────────

function CoursePerformanceTable() {
  const { data, isLoading } = api.analytics.coursePerformance.useQuery({ limit: 10 });

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const rows = (data ?? []) as Record<string, unknown>[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4" />
          Top courses by enrollment
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead className="text-right">Enrolled</TableHead>
              <TableHead className="text-right">Completed</TableHead>
              <TableHead className="text-right">Completion %</TableHead>
              <TableHead className="text-right">Avg progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm font-medium">{String(r.title ?? "")}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{String(r.teacher_name ?? "")}</TableCell>
                <TableCell className="text-right text-sm">{String(r.enrolled_count ?? 0)}</TableCell>
                <TableCell className="text-right text-sm">{String(r.completed_count ?? 0)}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={Number(r.completion_rate_pct) > 50 ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {String(r.completion_rate_pct ?? 0)}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {String(r.avg_progress ?? 0)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Engagement chart ─────────────────────────────────────────────────────────

function EngagementChart() {
  const { data, isLoading } = api.analytics.engagement.useQuery();

  if (isLoading) return <Skeleton className="h-64 rounded-xl" />;

  const rows = (data ?? []) as { date: string; new_enrollments: string }[];
  const chartData = rows.map((r) => ({
    date: r.date.slice(5), // MM-DD
    enrollments: Number(r.new_enrollments),
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Enrollments — last 30 days</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="enrollments"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Export buttons ───────────────────────────────────────────────────────────

function ExportButtons() {
  const { refetch: fetchEnrollments } = api.analytics.exportEnrollments.useQuery(
    {},
    { enabled: false },
  );

  async function exportCSV() {
    const { data } = await fetchEnrollments();
    if (!data?.length) {
      toast.error("No data to export");
      return;
    }
    const rows = data as Record<string, unknown>[];
    const headers = Object.keys(rows[0]!).join(",");
    const body = rows.map((r) => Object.values(r).join(",")).join("\n");
    const blob = new Blob([`${headers}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "enrollments.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded");
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={exportCSV}>
      <Download className="h-4 w-4" />
      Export enrollments CSV
    </Button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        description="Platform performance and engagement"
        crumbs={[{ label: "Admin" }, { label: "Analytics" }]}
        action={<ExportButtons />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EngagementChart />
      </div>

      <CoursePerformanceTable />
    </div>
  );
}