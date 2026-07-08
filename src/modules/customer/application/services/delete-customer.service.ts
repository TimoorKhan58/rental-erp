import { toCustomerId } from "../mappers/customer.mapper";
import {
  CustomerIdParamSchema,
  type CustomerIdParamInput,
} from "../schemas/customer.schemas";
import { toCustomerAuditValues } from "./customer-audit.mapper";
import {
  CUSTOMER_ENTITY_NAME,
  CUSTOMER_MODULE,
} from "./customer-service.constants";
import type { ICustomerTransactionRunner } from "./customer-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class DeleteCustomerService {
  constructor(private readonly transactionRunner: ICustomerTransactionRunner) {}

  async execute(input: CustomerIdParamInput): Promise<void> {
    const { id } = parseRequest(CustomerIdParamSchema, input);
    const customerId = toCustomerId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(customerId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Customer not found",
          details: { id },
        });
      }

      await repository.delete(customerId);

      await auditLogger.log({
        module: CUSTOMER_MODULE,
        entityName: CUSTOMER_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toCustomerAuditValues(existing),
      });
    });
  }
}
