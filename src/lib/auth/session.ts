import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";
import {
  resolveActiveSessionUser,
  type ResolvedSessionUser,
} from "@/shared/infrastructure/auth";

export async function getServerSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

/**
 * Session existence only. Prefer `requireActiveSession` for protected app access.
 */
export async function requireSession(redirectTo = "/login"): Promise<Session> {
  const session = await getServerSession();

  if (!session) {
    redirect(redirectTo);
  }

  return session;
}

export type ActiveServerSession = {
  session: Session;
  user: ResolvedSessionUser;
};

/**
 * Requires a Better Auth session linked to an active ERP user.
 * Inactive/unlinked sessions are cleared via the existing `/logout` route
 * (RSC cannot reliably write Set-Cookie during render).
 */
export async function requireActiveSession(
  redirectTo = "/login",
): Promise<ActiveServerSession> {
  const session = await getServerSession();

  if (!session) {
    redirect(redirectTo);
  }

  const user = await resolveActiveSessionUser(session);

  if (user === null) {
    redirect("/logout");
  }

  return { session, user };
}
