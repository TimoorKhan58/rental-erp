"use client";

import { BellIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useNotificationPermissions,
  useUnreadNotificationCount,
} from "../hooks";

type NotificationBellButtonProps = {
  onClick: () => void;
};

export function NotificationBellButton({ onClick }: NotificationBellButtonProps) {
  const { canRead, isLoading: permissionsLoading } = useNotificationPermissions();
  const { data: unreadCount = 0 } = useUnreadNotificationCount(canRead);

  if (permissionsLoading || !canRead) {
    return null;
  }

  const badgeLabel =
    unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={
        unreadCount > 0
          ? `Notifications, ${unreadCount} unread`
          : "Notifications, no unread"
      }
      className="relative"
      onClick={onClick}
    >
      <BellIcon className="size-4" aria-hidden="true" />
      {badgeLabel ? (
        <Badge
          className="absolute -top-1 -right-1 size-4 justify-center rounded-full p-0 text-[10px]"
          aria-hidden="true"
        >
          {badgeLabel}
        </Badge>
      ) : null}
    </Button>
  );
}
