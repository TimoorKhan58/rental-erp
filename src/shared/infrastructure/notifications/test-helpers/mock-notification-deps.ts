import type { DbClient } from "@/shared/infrastructure/database/prisma-types";

import { noopNotificationService } from "../noop-notification-service";

export const mockNotificationDb = {
  user: {
    findMany: async () => [],
  },
} as unknown as DbClient;

export const mockNotificationWriteScopeDeps = {
  notificationService: noopNotificationService,
  db: mockNotificationDb,
} as const;
