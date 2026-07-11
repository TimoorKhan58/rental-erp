"use client";

import { SemanticBadge } from "@/components/design-system/badge";
import type { NotificationStatus } from "../types";
import { STATUS_LABELS } from "../mappers";

type NotificationStatusBadgeProps = {
  status: NotificationStatus;
};

const statusSemantic: Record<
  NotificationStatus,
  "pending" | "info" | "success" | "error" | "inactive" | "warning"
> = {
  PENDING: "pending",
  QUEUED: "info",
  SENT: "success",
  DELIVERED: "success",
  FAILED: "error",
  CANCELLED: "inactive",
};

export function NotificationStatusBadge({ status }: NotificationStatusBadgeProps) {
  return (
    <SemanticBadge semantic={statusSemantic[status]}>
      {STATUS_LABELS[status]}
    </SemanticBadge>
  );
}
