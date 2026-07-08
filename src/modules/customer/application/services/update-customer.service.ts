import type { CustomerDto } from "../dtos/customer.dto";
import {
  toCustomerDto,
  toCustomerId,
  toUpdateCustomerData,
} from "../mappers/customer.mapper";
import {
  CustomerIdParamSchema,
  UpdateCustomerSchema,
  type CustomerIdParamInput,
  type UpdateCustomerInput,
} from "../schemas/customer.schemas";
import { toCustomerAuditValues } from "./customer-audit.mapper";
import {
  CUSTOMER_ENTITY_NAME,
  CUSTOMER_MODULE,
} from "./customer-service.constants";
import type { ICustomerTransactionRunner } from "./customer-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

export class UpdateCustomerService {
  constructor(private readonly transactionRunner: ICustomerTransactionRunner) {}

  async execute(
    params: CustomerIdParamInput,
    input: UpdateCustomerInput,
  ): Promise<CustomerDto> {
    const { id } = parseRequest(CustomerIdParamSchema, params);
    const data = parseRequest(UpdateCustomerSchema, input);
    const customerId = toCustomerId(id);
    const updateData = toUpdateCustomerData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(customerId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Customer not found",
          details: { id },
        });
      }

      if (updateData.phone !== undefined) {
        const phoneOwner = await repository.findByPhone(updateData.phone);

        if (phoneOwner !== null && phoneOwner.id !== customerId) {
          throw new ConflictError({
            message: "Phone number already exists",
            details: { phone: updateData.phone },
          });
        }
      }

      const updated = await repository.update(customerId, updateData);

      await auditLogger.log({
        module: CUSTOMER_MODULE,
        entityName: CUSTOMER_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: toCustomerAuditValues(existing),
        newValues: toCustomerAuditValues(updated),
      });

      return toCustomerDto(updated);
    });
  }
}
