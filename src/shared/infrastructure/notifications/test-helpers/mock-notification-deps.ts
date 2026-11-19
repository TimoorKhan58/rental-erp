import type { DbClient } from "@/shared/infrastructure/database/prisma-types";

import { noopNotificationService } from "../noop-notification-service";

export const mockNotificationDb = {
  user: {
    findMany: async () => [],
  },
  // Order services check the customer and products are active (assertBookable).
  customer: {
    findUnique: async () => null,
  },
  product: {
    findMany: async () => [],
  },
} as unknown as DbClient;

export const mockNotificationWriteScopeDeps = {
  notificationService: noopNotificationService,
  db: mockNotificationDb,
} as const;
