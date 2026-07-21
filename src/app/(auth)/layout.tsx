import type { ReactNode } from "react";
import { AuthLayout } from "@/layouts";
import { getOrganizationName } from "@/lib/branding/get-organization-name";

type AuthGroupLayoutProps = {
  children: ReactNode;
};

export default async function AuthGroupLayout({ children }: AuthGroupLayoutProps) {
  const organizationName = await getOrganizationName();

  return <AuthLayout organizationName={organizationName}>{children}</AuthLayout>;
}
