import type { SupplierDto } from "../dtos/supplier.dto";
import {
  toSupplierDto,
  toSupplierId,
  toUpdateSupplierData,
} from "../mappers/supplier.mapper";
import {
  SupplierIdParamSchema,
  UpdateSupplierSchema,
  type SupplierIdParamInput,
  type UpdateSupplierInput,
} from "../schemas/supplier.schemas";
import { toSupplierAuditValues } from "./supplier-audit.mapper";
import {
  SUPPLIER_ENTITY_NAME,
  SUPPLIER_MODULE,
} from "./supplier-service.constants";
import type { ISupplierTransactionRunner } from "./supplier-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { ConflictError, NotFoundError } from "@/shared/infrastructure/errors";

export class UpdateSupplierService {
  constructor(private readonly transactionRunner: ISupplierTransactionRunner) {}

  async execute(
    params: SupplierIdParamInput,
    input: UpdateSupplierInput,
  ): Promise<SupplierDto> {
    const { id } = parseRequest(SupplierIdParamSchema, params);
    const data = parseRequest(UpdateSupplierSchema, input);
    const supplierId = toSupplierId(id);
    const updateData = toUpdateSupplierData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existing = await repository.findById(supplierId);

      if (existing === null) {
        throw new NotFoundError({
          message: "Supplier not found",
          details: { id },
        });
      }

      if (updateData.phone !== undefined) {
        const phoneOwner = await repository.findByPhone(updateData.phone);

        if (phoneOwner !== null && phoneOwner.id !== supplierId) {
          throw new ConflictError({
            message: "Phone number already exists",
            details: { phone: updateData.phone },
          });
        }
      }

      const updated = await repository.update(supplierId, updateData);

      await auditLogger.log({
        module: SUPPLIER_MODULE,
        entityName: SUPPLIER_ENTITY_NAME,
        recordId: updated.id,
        action: "UPDATE",
        status: "SUCCESS",
        oldValues: toSupplierAuditValues(existing),
        newValues: toSupplierAuditValues(updated),
      });

      return toSupplierDto(updated);
    });
  }
}
