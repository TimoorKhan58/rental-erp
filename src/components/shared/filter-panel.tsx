import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FilterPanelProps = {
  title?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function FilterPanel({
  title = "Filters",
  children,
  actions,
  className,
}: FilterPanelProps) {
  return (
    <Card className={cn("border-border/80", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </CardContent>
    </Card>
  );
}
