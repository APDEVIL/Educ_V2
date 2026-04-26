"use client";

import { authClient } from "@/server/better-auth/client";

export { authClient } from "@/server/better-auth/client";
export type { Session } from "@/server/better-auth/client";

// Convenience hook — wraps authClient.$Infer.Session
export function useSession() {
  return authClient.useSession();
}

export function useUser() {
  const { data } = authClient.useSession();
  return data?.user ?? null;
}

export function useRole() {
  const user = useUser();
  return (user as { role?: string } | null)?.role ?? null;
}