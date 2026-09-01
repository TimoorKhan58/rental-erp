import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalAgreement,
  ExternalRentalInvariantError,
  type CreateExternalRentalAgreementData,
} from "@/modules/external-rental/domain";
import {
  ConflictError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";
import type { IExternalRentalRepository } from "@/modules/external-rental/domain";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import { toExternalRentalAgreementDto } from "../mappers/external-rental.mapper";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";

export type ExternalRentalCreateScope = {
  readonly externalRentalRepository: IExternalRentalRepository;
  readonly auditLogger: IAuditLogger;
};

/**
 * Creates an external rental agreement within an existing UoW.
 * Callers must hold any required locks before invoking.
 */
export async function executeCreateExternalRentalInScope(
  scope: ExternalRentalCreateScope,
  createData: CreateExternalRentalAgreementData,
): Promise<ExternalRentalAgreementDto> {
  try {
    ExternalRentalAgreement.create(createData);
  } catch (error) {
    if (error instanceof ExternalRentalInvariantError) {
      throw new UnprocessableError({
        message: error.message,
        details: { field: error.field },
      });
    }

    throw error;
  }

  const existingByNumber =
    await scope.externalRentalRepository.findByAgreementNumber(
      createData.agreementNumber,
    );

  if (existingByNumber !== null) {
    throw new ConflictError({
      message: "Agreement number already exists",
      details: { agreementNumber: createData.agreementNumber },
    });
  }

  const existingByOrder =
    await scope.externalRentalRepository.findActiveByRentalOrderId(
      createData.rentalOrderId,
    );

  if (existingByOrder !== null) {
    throw new ConflictError({
      message:
        "Active external rental agreement already exists for rental order",
      details: { rentalOrderId: createData.rentalOrderId },
    });
  }

  const agreement = await scope.externalRentalRepository.create(createData);

  await scope.auditLogger.log({
    module: EXTERNAL_RENTAL_MODULE,
    entityName: EXTERNAL_RENTAL_ENTITY_NAME,
    recordId: agreement.id,
    action: "CREATE",
    status: "SUCCESS",
    newValues: toExternalRentalAuditValues(agreement),
  });

  return toExternalRentalAgreementDto(agreement);
}
