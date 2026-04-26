import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin/dashboard",
  teacher: "/teacher/dashboard",
  student: "/student/dashboard",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fetch session from better-auth
  const sessionRes = await fetch(
    new URL("/api/auth/get-session", request.url),
    { headers: { cookie: request.headers.get("cookie") ?? "" } },
  );

  const session = sessionRes.ok ? await sessionRes.json() : null;
  const user = session?.user ?? null;
  const role: string = user?.role ?? "student";

  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const isProtected =
    pathname.startsWith("/student") ||
    pathname.startsWith("/teacher") ||
    pathname.startsWith("/admin");

  // Not logged in → send to sign-in
  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Logged in → don't let them see auth pages
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/student/dashboard", request.url));
  }

  // ✅ Role guard — teacher hitting /student/... gets bounced to their dashboard
  if (user && isProtected) {
    const accessingRole = pathname.split("/")[1]; // "student" | "teacher" | "admin"
    if (accessingRole && accessingRole !== role) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? "/student/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/student/:path*",
    "/teacher/:path*",
    "/admin/:path*",
    "/sign-in",
    "/sign-up",
  ],
};