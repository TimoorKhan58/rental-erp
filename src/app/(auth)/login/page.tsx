import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TentIcon } from "lucide-react";
import { APPLICATION } from "@/constants/application";
import { LoginForm } from "@/components/shared/login-form";
import { getServerSession } from "@/lib/auth/session";
import { getOrganizationName } from "@/lib/branding/get-organization-name";

export default async function LoginPage() {
  const session = await getServerSession();
  const organizationName = await getOrganizationName();

  if (session) {
    redirect("/");
  }

  return (
    <>
      <div className="mb-8 lg:hidden">
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <TentIcon className="size-5" aria-hidden="true" />
          </div>
          <span className="font-heading text-xl font-semibold tracking-tight">
            {APPLICATION.name}
          </span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {organizationName}
        </p>
      </div>

      <div className="mb-6 hidden lg:block">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your {organizationName} account
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
