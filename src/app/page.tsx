import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/better-auth";

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) redirect("/sign-in");

  const role = (session.user as { role?: string }).role;

  if (role === "admin")   redirect("/admin/dashboard");
  if (role === "teacher") redirect("/teacher/dashboard");

  redirect("/dashboard");
}