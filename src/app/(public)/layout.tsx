import type { ReactNode } from "react";
import { PublicLayout } from "@/layouts";

type PublicGroupLayoutProps = {
  children: ReactNode;
};

export default function PublicGroupLayout({ children }: PublicGroupLayoutProps) {
  return <PublicLayout>{children}</PublicLayout>;
}
