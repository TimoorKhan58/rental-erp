"use client";

import { memo } from "react";
import { SemanticBadge } from "@/components/design-system/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import type { UpcomingTask } from "../types";
import { DashboardWidget, DashboardWidgetSkeleton } from "./widgets";

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
      <DashboardWidgetSkeleton title="Loading today's tasks">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </DashboardWidgetSkeleton>
    );
  }

  return (
    <DashboardWidget
      title="Today's Tasks"
      description="Items requiring attention"
    >
      {tasks.length === 0 ? (
        <p className="font-sans text-sm text-muted-foreground">
          No tasks scheduled.
        </p>
      ) : (
        <ul className="space-y-1.5" aria-label="Today's tasks">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-foreground">
                  {task.title}
                </p>
                <p className="mt-0.5 font-sans text-xs text-muted-foreground">
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
      )}
    </DashboardWidget>
  );
});
