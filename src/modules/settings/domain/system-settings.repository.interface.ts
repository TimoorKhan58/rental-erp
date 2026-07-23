import type { SystemSettingId } from "@/shared/domain/ids";

import type { SystemSettings } from "./system-settings.entity";
import type { UpdateSystemSettingsData } from "./settings.types";

export interface ISystemSettingsRepository {
  findActive(): Promise<SystemSettings | null>;
  createDefault(): Promise<SystemSettings>;
  update(id: SystemSettingId, data: UpdateSystemSettingsData): Promise<SystemSettings>;
}
