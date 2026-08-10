import type { INotificationService } from "./notification-service.interface";
import type {
  NotificationPayload,
  NotificationResult,
} from "./notification-types";

export class NoOpNotificationService implements INotificationService {
  async enqueue(_payload: NotificationPayload): Promise<NotificationResult> {
    return {
      notificationId: "00000000-0000-4000-8000-000000000000",
      queuedAt: new Date(),
    };
  }

  async cancel(_notificationId: string): Promise<void> {
    // no-op
  }
}

export const noopNotificationService = new NoOpNotificationService();
