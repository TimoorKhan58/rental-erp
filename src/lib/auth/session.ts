import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, type Session } from "@/lib/auth";

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

  return session;
}
