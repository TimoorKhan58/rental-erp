import { describe, expect, it } from "vitest";

import { ForbiddenError } from "@/shared/infrastructure/errors";
import { toNotificationAccessContext } from "@/modules/notification/domain/notification.access";
import { USER_ROLES } from "@/constants/roles";

import { GetNotificationByIdService } from "./services/get-notification-by-id.service";
import { ListNotificationsService } from "./services/list-notifications.service";
import { MarkAllNotificationsReadService } from "./services/mark-all-notifications-read.service";
import { MarkNotificationReadService } from "./services/mark-notification-read.service";
import {
  buildNotificationItem,
  InMemoryNotificationRepository,
  NOTIFICATION_VIEWER_ID,
  OTHER_USER_ID,
} from "../tests/helpers/in-memory-notification.repository";

describe("ListNotificationsService", () => {
  it("returns paginated notifications for the viewer", async () => {
    const repository = new InMemoryNotificationRepository();
    repository.seed([
      buildNotificationItem({ userId: NOTIFICATION_VIEWER_ID }),
      buildNotificationItem({ userId: OTHER_USER_ID }),
    ]);
    const service = new ListNotificationsService(repository);
    const access = toNotificationAccessContext({
      viewerUserId: NOTIFICATION_VIEWER_ID,
      role: USER_ROLES.MANAGER,
    });

    const result = await service.execute({ page: 1, pageSize: 20 }, access);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Expense approved");
    expect(result.meta.total).toBe(1);
  });

  it("returns empty page when viewer has no notifications", async () => {
    const repository = new InMemoryNotificationRepository();
    repository.seed([buildNotificationItem({ userId: OTHER_USER_ID })]);
    const service = new ListNotificationsService(repository);
    const access = toNotificationAccessContext({
      viewerUserId: NOTIFICATION_VIEWER_ID,
      role: USER_ROLES.MANAGER,
    });

    const result = await service.execute({ page: 1, pageSize: 20 }, access);

    expect(result.items).toHaveLength(0);
    expect(result.meta.total).toBe(0);
  });

  it("forbids recipientId filter for non-admin viewers", async () => {
    const repository = new InMemoryNotificationRepository();
    const service = new ListNotificationsService(repository);
    const access = toNotificationAccessContext({
      viewerUserId: NOTIFICATION_VIEWER_ID,
      role: USER_ROLES.MANAGER,
    });

    await expect(
      service.execute(
        {
          page: 1,
          pageSize: 20,
          recipientId: "00000000-0000-4000-8000-000000000301",
        },
        access,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("allows recipientId filter for owner (view all)", async () => {
    const repository = new InMemoryNotificationRepository();
    const targetRecipient = "00000000-0000-4000-8000-000000000302";
    repository.seed([
      buildNotificationItem({
        userId: OTHER_USER_ID,
        recipientId: targetRecipient,
      }),
      buildNotificationItem({ userId: OTHER_USER_ID }),
    ]);
    const service = new ListNotificationsService(repository);
    const access = toNotificationAccessContext({
      viewerUserId: NOTIFICATION_VIEWER_ID,
      role: USER_ROLES.OWNER,
    });

    const result = await service.execute(
      { page: 1, pageSize: 20, recipientId: targetRecipient },
      access,
    );

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.recipientId).toBe(targetRecipient);
  });
});

describe("GetNotificationByIdService", () => {
  it("returns notification when viewer owns the inbox item", async () => {
    const repository = new InMemoryNotificationRepository();
    const item = buildNotificationItem({ userId: NOTIFICATION_VIEWER_ID });
    repository.seed([item]);
    const service = new GetNotificationByIdService(repository);
    const access = toNotificationAccessContext({
      viewerUserId: NOTIFICATION_VIEWER_ID,
      role: USER_ROLES.MANAGER,
    });

    const result = await service.execute(
      { id: item.notificationId },
      access,
    );

    expect(result.id).toBe(item.notificationId);
  });
});

describe("MarkNotificationReadService", () => {
  it("marks a notification as read", async () => {
    const repository = new InMemoryNotificationRepository();
    const item = buildNotificationItem({ userId: NOTIFICATION_VIEWER_ID });
    repository.seed([item]);
    const service = new MarkNotificationReadService(repository);
    const access = toNotificationAccessContext({
      viewerUserId: NOTIFICATION_VIEWER_ID,
      role: USER_ROLES.MANAGER,
    });

    const result = await service.execute(
      { id: item.notificationId },
      access,
    );

    expect(result.isRead).toBe(true);
    expect(result.readAt).not.toBeNull();
  });
});

describe("MarkAllNotificationsReadService", () => {
  it("marks all unread notifications for the viewer", async () => {
    const repository = new InMemoryNotificationRepository();
    repository.seed([
      buildNotificationItem({ userId: NOTIFICATION_VIEWER_ID, isRead: false }),
      buildNotificationItem({ userId: NOTIFICATION_VIEWER_ID, isRead: false }),
      buildNotificationItem({ userId: OTHER_USER_ID, isRead: false }),
    ]);
    const service = new MarkAllNotificationsReadService(repository);
    const access = toNotificationAccessContext({
      viewerUserId: NOTIFICATION_VIEWER_ID,
      role: USER_ROLES.MANAGER,
    });

    const result = await service.execute(access);

    expect(result.markedCount).toBe(2);
  });
});
