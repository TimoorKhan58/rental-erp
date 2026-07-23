import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/shared/brand-logo";
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
        <div className="mb-4 flex justify-center">
          <BrandLogo size="md" showTagline />
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {organizationName}
        </p>
      </div>

      <div className="mb-7 hidden lg:block">
        <h1 className="font-heading text-[1.75rem] font-semibold tracking-tight">
          Welcome back
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to your {organizationName} account
        </p>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
