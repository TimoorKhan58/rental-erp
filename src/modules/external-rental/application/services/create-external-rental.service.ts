import { resolveDocumentCode } from "@/modules/settings/application/services/resolve-document-code";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import {
  ExternalRentalAgreement,
  ExternalRentalInvariantError,
} from "@/modules/external-rental/domain";
import { parseRequest } from "@/shared/application/validation";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import {
  toCreateExternalRentalAgreementData,
  toUserId,
} from "../mappers/external-rental.mapper";
import {
  CreateExternalRentalSchema,
  type CreateExternalRentalInput,
} from "../schemas/external-rental.schemas";
import { executeCreateExternalRentalInScope } from "./create-external-rental-in-scope";
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

    return this.transactionRunner.run(({ externalRentalRepository, auditLogger }) =>
      executeCreateExternalRentalInScope(
        { externalRentalRepository, auditLogger },
        createData,
      ),
    );
  }
}
