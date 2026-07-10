import { DashboardLayoutNotFoundError } from "@/modules/dashboard/domain/dashboard.errors";
import type { IDashboardLayoutRepository } from "@/modules/dashboard/domain/dashboard.repository.interface";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { DashboardLayoutDto } from "../dtos/dashboard.dto";
import { toDashboardLayoutDto } from "../mappers/dashboard.mapper";

export class GetDashboardLayoutService {
  constructor(private readonly repository: IDashboardLayoutRepository) {}

  async execute(userId: string): Promise<DashboardLayoutDto> {
    const layout = await this.repository.findByUserId(userId);

    if (layout === null) {
      const notFound = new DashboardLayoutNotFoundError(userId);
      throw new NotFoundError({
        message: notFound.message,
        details: { userId },
      });
    }

    return toDashboardLayoutDto(layout);
  }
}
