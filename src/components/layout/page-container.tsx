import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PageContainerProps = {
  children: ReactNode;
  className?: string;
};

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[90rem] flex-1 p-4 md:p-6 lg:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
