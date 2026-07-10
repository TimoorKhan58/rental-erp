import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { NotificationServiceResolver } from "@/modules/notification/application/services/notification-application-services.interface";
import { createNotificationApplicationServices } from "@/modules/notification/infrastructure";

export const resolveNotificationApplicationServices: NotificationServiceResolver = (
  ctx: ExecutionContext,
) => createNotificationApplicationServices(createSharedDepsFromExecutionContext(ctx));
