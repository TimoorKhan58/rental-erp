import type {
  NotificationPayload,
  NotificationResult,
} from "./notification-types";

export interface INotificationService {
  enqueue(payload: NotificationPayload): Promise<NotificationResult>;
  cancel(notificationId: string): Promise<void>;
}
