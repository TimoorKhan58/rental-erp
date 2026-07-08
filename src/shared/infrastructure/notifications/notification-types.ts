export const NOTIFICATION_PRIORITIES = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
] as const;

export const NOTIFICATION_CHANNELS = [
  "IN_APP",
  "EMAIL",
  "SMS",
  "WHATSAPP",
  "PUSH",
] as const;

export const NOTIFICATION_STATUSES = [
  "PENDING",
  "QUEUED",
  "SENT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
] as const;

export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface RecipientInput {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
  whatsApp?: string;
}

export interface NotificationPayload {
  eventKey: string;
  module: string;
  entityName: string;
  recordId: string;
  recipients: RecipientInput[];
  priority?: NotificationPriority;
  scheduledAt?: Date;
  data?: Record<string, unknown>;
}

export interface NotificationResult {
  notificationId: string;
  queuedAt: Date;
}
