"use client";

import { memo } from "react";
import { SectionCard } from "@/components/design-system/card";
import { SemanticBadge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { UpcomingTask } from "../types";

const priorityBadge = {
  low: "draft",
  medium: "pending",
  high: "overdue",
} as const;

const statusBadge = {
  pending: "pending",
  in_progress: "info",
  completed: "success",
} as const;

type UpcomingTasksListProps = {
  tasks: UpcomingTask[];
  isLoading?: boolean;
};

export const UpcomingTasksList = memo(function UpcomingTasksList({
  tasks,
  isLoading,
}: UpcomingTasksListProps) {
  if (isLoading) {
    return (
      <SectionCard title="Upcoming Tasks">
        <div className="space-y-3" aria-busy="true">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Upcoming Tasks" description="Items requiring attention">
      <ul className="space-y-2" aria-label="Upcoming tasks">
        {tasks.map((task) => (
          <li
            key={task.id}
            className="flex flex-col gap-2 rounded-lg border border-border/80 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(task.dueDate)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SemanticBadge semantic={priorityBadge[task.priority]}>
                {task.priority}
              </SemanticBadge>
              <SemanticBadge semantic={statusBadge[task.status]}>
                {task.status.replace("_", " ")}
              </SemanticBadge>
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
});
