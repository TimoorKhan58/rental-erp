import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContentAreaProps = {
  children: ReactNode;
  className?: string;
};

export function ContentArea({ children, className }: ContentAreaProps) {
  return (
    <section className={cn("flex min-w-0 w-full flex-1 flex-col", className)}>
      {children}
    </section>
  );
}
