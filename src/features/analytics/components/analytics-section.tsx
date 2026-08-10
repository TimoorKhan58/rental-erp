import type { ReactNode } from "react";
import { SectionCard } from "@/components/design-system/card";

type AnalyticsSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

export function AnalyticsSection({
  title,
  description,
  children,
}: AnalyticsSectionProps) {
  return (
    <SectionCard title={title} description={description}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {children}
      </div>
    </SectionCard>
  );
}
