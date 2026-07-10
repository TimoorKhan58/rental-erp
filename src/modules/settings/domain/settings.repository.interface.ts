import type { CompanySettingId } from "@/shared/domain/ids";

import type { Settings } from "./settings.entity";
import type { UpdateSettingsData } from "./settings.types";

export interface ISettingsRepository {
  findActive(): Promise<Settings | null>;
  ensureExists(): Promise<Settings>;
  update(id: CompanySettingId, data: UpdateSettingsData): Promise<Settings>;
}
