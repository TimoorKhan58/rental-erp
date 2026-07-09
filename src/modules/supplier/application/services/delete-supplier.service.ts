import { toSupplierId } from "../mappers/supplier.mapper";
import {
  SupplierIdParamSchema,
  type SupplierIdParamInput,
} from "../schemas/supplier.schemas";
import { toSupplierAuditValues } from "./supplier-audit.mapper";
import {
  SUPPLIER_ENTITY_NAME,
  SUPPLIER_MODULE,
} from "./supplier-service.constants";
import type { ISupplierTransactionRunner } from "./supplier-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

export class DeleteSupplierService {
  constructor(private readonly transactionRunner: ISupplierTransactionRunner) {}

  async execute(input: SupplierIdParamInput): Promise<void> {
    const { id } = parseRequest(SupplierIdParamSchema, input);
    const supplierId = toSupplierId(id);

    await this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(supplierId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Supplier not found",
          details: { id },
        });
      }

      await repository.delete(supplierId);

      await auditLogger.log({
        module: SUPPLIER_MODULE,
        entityName: SUPPLIER_ENTITY_NAME,
        recordId: existing.id,
        action: "DELETE",
        status: "SUCCESS",
        oldValues: toSupplierAuditValues(existing),
      });
    });
  }
}
