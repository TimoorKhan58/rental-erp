import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";
import { ensureActiveErpUser } from "@/shared/infrastructure/auth/ensure-active-erp-user";
import { resolveSessionUser } from "@/shared/infrastructure/auth/resolve-session-user";

export async function getServerSession(): Promise<Session | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session;
}

export async function requireSession(redirectTo = "/login"): Promise<Session> {
  const session = await getServerSession();

  if (!session) {
    redirect(redirectTo);
  }

  const resolved = resolveSessionUser(session);

  if (resolved === null) {
    redirect(redirectTo);
  }

  try {
    await ensureActiveErpUser(resolved.erpUserId);
  } catch {
    redirect(redirectTo);
  }

  return session;
}
