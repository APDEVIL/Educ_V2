import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/better-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;
  if (!["admin", "teacher"].includes(role ?? "")) redirect("/dashboard");

  return <DashboardShell>{children}</DashboardShell>;
}