"use client";

import { SemanticBadge } from "@/components/design-system/badge";
import type { NotificationChannel } from "../types";
import { CHANNEL_LABELS } from "../mappers";

type NotificationChannelBadgeProps = {
  channel: NotificationChannel;
};

const channelSemantic: Record<
  NotificationChannel,
  "info" | "draft" | "pending" | "success" | "active"
> = {
  IN_APP: "info",
  EMAIL: "draft",
  SMS: "pending",
  WHATSAPP: "success",
  PUSH: "active",
};

export function NotificationChannelBadge({ channel }: NotificationChannelBadgeProps) {
  return (
    <SemanticBadge semantic={channelSemantic[channel]}>
      {CHANNEL_LABELS[channel]}
    </SemanticBadge>
  );
}
