import { Suspense } from "react";
import { api } from "@/trpc/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, BookOpen, GraduationCap, TrendingUp, CheckCircle2, FileText } from "lucide-react";
import { AdminEngagementChart } from "@/app/_components/engagement-chart";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
          {sub && <span className="text-[11px] text-blue-600 dark:text-blue-400">{sub}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Stats loader ─────────────────────────────────────────────────────────────

async function PlatformStats() {
  const stats = await api.analytics.platformStats();
  if (!stats) return null;

  const s = stats as Record<string, unknown>;

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Students"    value={Number(s.total_students)}    icon={GraduationCap} sub={`+${s.new_users_30d} this month`} />
      <StatCard label="Teachers"    value={Number(s.total_teachers)}    icon={Users} />
      <StatCard label="Courses"     value={Number(s.total_courses)}     icon={BookOpen} />
      <StatCard label="Enrollments" value={Number(s.total_enrollments)} icon={TrendingUp} sub={`+${s.new_enrollments_30d} this month`} />
      <StatCard label="Completions" value={Number(s.total_completions)} icon={CheckCircle2} />
      <StatCard label="Submissions" value={Number(s.total_submissions)} icon={FileText} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="Platform-wide overview"
        crumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
      />

      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        }
      >
        <PlatformStats />
      </Suspense>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Suspense fallback={<Skeleton className="h-72 rounded-xl" />}>
          <AdminEngagementChart />
        </Suspense>
      </div>
    </div>
  );
}