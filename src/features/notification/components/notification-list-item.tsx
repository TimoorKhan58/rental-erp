"use client";

import { memo } from "react";
import {
  AlertTriangleIcon,
  BellIcon,
  InfoIcon,
  MailIcon,
  MessageSquareIcon,
  SmartphoneIcon,
} from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import type { NotificationChannel, NotificationResponse } from "../types";

type NotificationListItemProps = {
  notification: NotificationResponse;
  onSelect: (notification: NotificationResponse) => void;
  onMarkRead?: (id: string) => void;
  canMarkRead?: boolean;
};

function NotificationIcon({
  channel,
  priority,
}: {
  channel: NotificationChannel;
  priority: NotificationResponse["priority"];
}) {
  const className = "size-4";
  if (priority === "URGENT" || priority === "HIGH") {
    return <AlertTriangleIcon className={className} />;
  }
  if (priority === "LOW") {
    return <InfoIcon className={className} />;
  }
  switch (channel) {
    case "EMAIL":
      return <MailIcon className={className} />;
    case "SMS":
    case "WHATSAPP":
      return <MessageSquareIcon className={className} />;
    case "PUSH":
      return <SmartphoneIcon className={className} />;
    default:
      return <BellIcon className={className} />;
  }
}

function NotificationListItemComponent({
  notification,
  onSelect,
  onMarkRead,
  canMarkRead = false,
}: NotificationListItemProps) {
  return (
    <li>
      <button
        type="button"
        className={cn(
          "flex w-full gap-3 rounded-md border border-transparent px-3 py-3 text-left transition-colors",
          "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !notification.isRead && "bg-info-muted/40",
        )}
        onClick={() => onSelect(notification)}
        aria-label={`${notification.isRead ? "Read" : "Unread"} notification: ${notification.title}`}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            notification.isRead ? "bg-muted text-muted-foreground" : "bg-info/15 text-info",
          )}
          aria-hidden="true"
        >
          <NotificationIcon
            channel={notification.channel}
            priority={notification.priority}
          />
        </span>

        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex items-start justify-between gap-2">
            <span
              className={cn(
                "truncate text-sm",
                notification.isRead ? "font-medium" : "font-semibold",
              )}
            >
              {notification.title}
            </span>
            {!notification.isRead ? (
              <span
                className="mt-1 size-2 shrink-0 rounded-full bg-info"
                aria-hidden="true"
              />
            ) : null}
          </span>
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {notification.body}
          </span>
          <span className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <time dateTime={notification.createdAt}>
              {formatDateTime(notification.createdAt)}
            </time>
            {canMarkRead && !notification.isRead && onMarkRead ? (
              <span
                role="button"
                tabIndex={0}
                className="shrink-0 font-medium text-primary hover:underline"
                onClick={(event) => {
                  event.stopPropagation();
                  onMarkRead(notification.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    onMarkRead(notification.id);
                  }
                }}
              >
                Mark read
              </span>
            ) : null}
          </span>
        </span>
      </button>
    </li>
  );
}

export const NotificationListItem = memo(NotificationListItemComponent);
