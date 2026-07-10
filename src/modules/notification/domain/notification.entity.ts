import type { NotificationId } from "@/shared/domain/ids";

import type { NotificationInboxItemProps } from "./notification.types";

export class NotificationInboxItem {
  readonly recipientId: string;
  readonly notificationId: NotificationId;
  readonly userId: string | null;
  readonly recipientName: string;
  readonly isRead: boolean;
  readonly readAt: Date | null;
  readonly channel: NotificationInboxItemProps["channel"];
  readonly status: NotificationInboxItemProps["status"];
  readonly priority: NotificationInboxItemProps["priority"];
  readonly module: string;
  readonly entityName: string;
  readonly recordId: string;
  readonly subject: string;
  readonly title: string;
  readonly body: string;
  readonly scheduledAt: Date | null;
  readonly sentAt: Date | null;
  readonly deliveredAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: NotificationInboxItemProps) {
    this.recipientId = props.recipientId;
    this.notificationId = props.notificationId;
    this.userId = props.userId;
    this.recipientName = props.recipientName;
    this.isRead = props.isRead;
    this.readAt = props.readAt;
    this.channel = props.channel;
    this.status = props.status;
    this.priority = props.priority;
    this.module = props.module;
    this.entityName = props.entityName;
    this.recordId = props.recordId;
    this.subject = props.subject;
    this.title = props.title;
    this.body = props.body;
    this.scheduledAt = props.scheduledAt;
    this.sentAt = props.sentAt;
    this.deliveredAt = props.deliveredAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static reconstitute(props: NotificationInboxItemProps): NotificationInboxItem {
    return new NotificationInboxItem(props);
  }

  toProps(): NotificationInboxItemProps {
    return {
      recipientId: this.recipientId,
      notificationId: this.notificationId,
      userId: this.userId,
      recipientName: this.recipientName,
      isRead: this.isRead,
      readAt: this.readAt,
      channel: this.channel,
      status: this.status,
      priority: this.priority,
      module: this.module,
      entityName: this.entityName,
      recordId: this.recordId,
      subject: this.subject,
      title: this.title,
      body: this.body,
      scheduledAt: this.scheduledAt,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
