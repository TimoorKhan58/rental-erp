import type { ExecutionContext } from "@/shared/application/context";
import { createSharedDepsFromExecutionContext } from "@/shared/infrastructure/di/shared-deps";

import type { SettingsServiceResolver } from "@/modules/settings/application/services/settings-application-services.interface";
import { createSettingsApplicationServices } from "@/modules/settings/infrastructure";

export const resolveSettingsApplicationServices: SettingsServiceResolver = (
  ctx: ExecutionContext,
) =>
  createSettingsApplicationServices(createSharedDepsFromExecutionContext(ctx));
