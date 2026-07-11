import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ROUTES } from "@/config/routes";
import { auth } from "@/lib/auth";

export default async function LogoutPage() {
  await auth.api.signOut({
    headers: await headers(),
  });

  redirect(ROUTES.login);
}
