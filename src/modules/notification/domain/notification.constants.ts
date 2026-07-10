export const NOTIFICATION_MODULE = "notification";

export const NOTIFICATION_SEARCH_FIELDS = [
  "title",
  "subject",
  "body",
  "module",
  "entityName",
  "recordId",
] as const;

export const NOTIFICATION_SORT_FIELDS = [
  "createdAt",
  "title",
  "status",
  "channel",
  "priority",
  "module",
  "isRead",
  "readAt",
] as const;

export type NotificationSortField = (typeof NOTIFICATION_SORT_FIELDS)[number];
