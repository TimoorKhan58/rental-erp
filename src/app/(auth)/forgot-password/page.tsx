import { BrandLogo } from "@/components/shared/brand-logo";
import { ForgotPasswordForm } from "@/components/shared/forgot-password-form";
import { getOrganizationName } from "@/lib/branding/get-organization-name";

export default async function ForgotPasswordPage() {
  const organizationName = await getOrganizationName();

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
          Forgot password
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Request a reset link for your {organizationName} account
        </p>
      </div>

      <ForgotPasswordForm />
    </>
  );
}
