import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import {
  toExternalRentalAgreementDto,
  toExternalRentalAgreementId,
} from "../mappers/external-rental.mapper";
import {
  ExternalRentalIdParamSchema,
  type ExternalRentalIdParamInput,
} from "../schemas/external-rental.schemas";
import type { IExternalRentalRepository } from "@/modules/external-rental/domain";

export class GetExternalRentalByIdService {
  constructor(private readonly repository: IExternalRentalRepository) {}

  async execute(
    params: ExternalRentalIdParamInput,
  ): Promise<ExternalRentalAgreementDto> {
    const { id } = parseRequest(ExternalRentalIdParamSchema, params);
    const agreement = await this.repository.findById(
      toExternalRentalAgreementId(id),
    );

    if (agreement === null) {
      throw new NotFoundError({
        message: "External rental agreement not found",
        details: { id },
      });
    }

    return toExternalRentalAgreementDto(agreement);
  }
}
