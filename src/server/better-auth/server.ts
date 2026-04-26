import { headers } from "next/headers";
import { cache } from "react";
import { auth } from ".";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

export const getSession = cache(async () => {
  // 1. Get the base session from Better-Auth
  const session = await auth.api.getSession({ 
    headers: await headers() 
  });

  if (!session?.user) return null;

  // 2. Correct Drizzle Query (Fixes: Property 'user' does not exist error)
  // Note: Better-Auth actually returns the role in the session automatically 
  // if defined in additionalFields, but if you want to force-fetch from DB:
  const dbUser = await db.query.users.findFirst({
    where: eq(users.email, session.user.email),
    columns: {
      role: true,
    }
  });

  if (dbUser) {
    // This will no longer throw an error because of additionalFields in config
    session.user.role = dbUser.role; 
  }

  return session;
});