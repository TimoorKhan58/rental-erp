import type {
  NotificationChannel,
  NotificationPriority,
  NotificationStatus,
} from "../types";

export const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  IN_APP: "In-app",
  EMAIL: "Email",
  SMS: "SMS",
  WHATSAPP: "WhatsApp",
  PUSH: "Push",
};

export const STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: "Pending",
  QUEUED: "Queued",
  SENT: "Sent",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const PRIORITY_LABELS: Record<NotificationPriority, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};
