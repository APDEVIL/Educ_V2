import { createAuthClient } from "better-auth/react";

// 1. Manually tell TypeScript that the User object includes a role
export const authClient = createAuthClient({
    // plugins: [ ... ] if you have any
});

// 2. This type helper ensures your hooks (useSession, etc.) see the role
export type Session = typeof authClient.$Infer.Session & {
    user: {
        role: "admin" | "teacher" | "student";
    };
};