import { resolveDocumentCode } from "@/modules/settings/application/services/resolve-document-code";
import type { INumberSequenceRepository } from "@/modules/settings/domain/number-sequence.repository.interface";
import type { CustomerDto } from "../dtos/customer.dto";
import {
  toCreateCustomerData,
  toCustomerDto,
} from "../mappers/customer.mapper";
import {
  CreateCustomerSchema,
  type CreateCustomerInput,
} from "../schemas/customer.schemas";
import { toCustomerAuditValues } from "./customer-audit.mapper";
import {
  CUSTOMER_ENTITY_NAME,
  CUSTOMER_MODULE,
} from "./customer-service.constants";
import type { ICustomerTransactionRunner } from "./customer-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

export class CreateCustomerService {
  constructor(
    private readonly transactionRunner: ICustomerTransactionRunner,
    private readonly numberSequences: INumberSequenceRepository,
  ) {}

  async execute(input: CreateCustomerInput): Promise<CustomerDto> {
    const data = parseRequest(CreateCustomerSchema, input);
    const customerCode = await resolveDocumentCode(
      this.numberSequences,
      "CUSTOMER",
      data.customerCode,
    );
    const createData = toCreateCustomerData({ ...data, customerCode });

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingCode = await repository.findByCustomerCode(
        createData.customerCode,
      );

      if (existingCode !== null) {
        throw new ConflictError({
          message: "Customer code already exists",
          details: { customerCode: createData.customerCode },
        });
      }

      const existingPhone = await repository.findByPhone(createData.phone);

      if (existingPhone !== null) {
        throw new ConflictError({
          message: "Phone number already exists",
          details: { phone: createData.phone },
        });
      }

      const customer = await repository.create(createData);

      await auditLogger.log({
        module: CUSTOMER_MODULE,
        entityName: CUSTOMER_ENTITY_NAME,
        recordId: customer.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toCustomerAuditValues(customer),
      });

      return toCustomerDto(customer);
    });
  }
}
