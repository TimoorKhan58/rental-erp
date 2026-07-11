import type { ReactNode } from "react";
import { AuthLayout } from "@/layouts";

type AuthGroupLayoutProps = {
  children: ReactNode;
};

export default function AuthGroupLayout({ children }: AuthGroupLayoutProps) {
  return <AuthLayout>{children}</AuthLayout>;
}
