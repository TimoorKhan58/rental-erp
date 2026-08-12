import { resolveDocumentCode } from "@/modules/settings/application/services/resolve-document-code";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import {
  EXTERNAL_RENTAL_ENTITY_NAME,
  EXTERNAL_RENTAL_MODULE,
  ExternalRentalAgreement,
  ExternalRentalInvariantError,
} from "@/modules/external-rental/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import {
  toCreateExternalRentalAgreementData,
  toExternalRentalAgreementDto,
  toUserId,
} from "../mappers/external-rental.mapper";
import {
  CreateExternalRentalSchema,
  type CreateExternalRentalInput,
} from "../schemas/external-rental.schemas";
import { toExternalRentalAuditValues } from "./external-rental-audit.mapper";
import type { IExternalRentalTransactionRunner } from "./external-rental-transaction.runner";

export class CreateExternalRentalService {
  constructor(
    private readonly transactionRunner: IExternalRentalTransactionRunner,
    private readonly numberSequences: INumberSequenceRepository,
    private readonly userId: string | undefined,
  ) {}

  async execute(
    input: CreateExternalRentalInput,
  ): Promise<ExternalRentalAgreementDto> {
    if (this.userId === undefined || this.userId.trim() === "") {
      throw new UnprocessableError({
        message: "User context is required to create external rental agreement",
      });
    }

    const data = parseRequest(CreateExternalRentalSchema, input);
    const agreementNumber = await resolveDocumentCode(
      this.numberSequences,
      "EXTERNAL_RENTAL_AGREEMENT",
      data.agreementNumber,
    );
    const createData = toCreateExternalRentalAgreementData(
      { ...data, agreementNumber },
      toUserId(this.userId),
    );

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

    return this.transactionRunner.run(
      async ({ externalRentalRepository, auditLogger }) => {
        const existingByNumber =
          await externalRentalRepository.findByAgreementNumber(
            createData.agreementNumber,
          );

        if (existingByNumber !== null) {
          throw new ConflictError({
            message: "Agreement number already exists",
            details: { agreementNumber: createData.agreementNumber },
          });
        }

        const existingByOrder =
          await externalRentalRepository.findActiveByRentalOrderId(
            createData.rentalOrderId,
          );

        if (existingByOrder !== null) {
          throw new ConflictError({
            message:
              "Active external rental agreement already exists for rental order",
            details: { rentalOrderId: createData.rentalOrderId },
          });
        }

        const agreement = await externalRentalRepository.create(createData);

        await auditLogger.log({
          module: EXTERNAL_RENTAL_MODULE,
          entityName: EXTERNAL_RENTAL_ENTITY_NAME,
          recordId: agreement.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toExternalRentalAuditValues(agreement),
        });

        return toExternalRentalAgreementDto(agreement);
      },
    );
  }
}
