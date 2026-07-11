"use client";

import { SemanticBadge } from "@/components/design-system/badge";
import type { NotificationPriority } from "../types";
import { PRIORITY_LABELS } from "../mappers";

type NotificationPriorityBadgeProps = {
  priority: NotificationPriority;
};

const prioritySemantic: Record<
  NotificationPriority,
  "draft" | "info" | "warning" | "error"
> = {
  LOW: "draft",
  NORMAL: "info",
  HIGH: "warning",
  URGENT: "error",
};

export function NotificationPriorityBadge({
  priority,
}: NotificationPriorityBadgeProps) {
  return (
    <SemanticBadge semantic={prioritySemantic[priority]}>
      {PRIORITY_LABELS[priority]}
    </SemanticBadge>
  );
}
