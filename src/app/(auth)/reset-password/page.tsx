import { Suspense } from "react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { ResetPasswordForm } from "@/components/shared/reset-password-form";
import { getOrganizationName } from "@/lib/branding/get-organization-name";
import { authConfig } from "@/shared/config/auth.config";

type ResetPasswordPageProps = {
  searchParams: Promise<{ invite?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const organizationName = await getOrganizationName();
  const params = await searchParams;
  const isInvite = params.invite === "1";

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
          {isInvite ? "Create your password" : "Reset password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isInvite
            ? `Set a password to activate your ${organizationName} account`
            : `Choose a new password for your ${organizationName} account`}
        </p>
      </div>

      <Suspense fallback={null}>
        <ResetPasswordForm minPasswordLength={authConfig.minPasswordLength} />
      </Suspense>
    </>
  );
}
