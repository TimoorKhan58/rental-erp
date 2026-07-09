import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { MaintenanceDto } from "../dtos/maintenance.dto";
import { toMaintenanceDto, toMaintenanceId } from "../mappers/maintenance.mapper";
import {
  MaintenanceIdParamSchema,
  type MaintenanceIdParamInput,
} from "../schemas/maintenance.schemas";
import type { IMaintenanceRepository } from "@/modules/maintenance/domain";

export class GetMaintenanceByIdService {
  constructor(private readonly repository: IMaintenanceRepository) {}

  async execute(params: MaintenanceIdParamInput): Promise<MaintenanceDto> {
    const { id } = parseRequest(MaintenanceIdParamSchema, params);
    const maintenance = await this.repository.findById(toMaintenanceId(id));

    if (maintenance === null) {
      throw new NotFoundError({
        message: "Maintenance not found",
        details: { id },
      });
    }

    return toMaintenanceDto(maintenance);
  }
}
