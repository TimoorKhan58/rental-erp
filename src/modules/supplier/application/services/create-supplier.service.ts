import type { SupplierDto } from "../dtos/supplier.dto";
import {
  toCreateSupplierData,
  toSupplierDto,
} from "../mappers/supplier.mapper";
import {
  CreateSupplierSchema,
  type CreateSupplierInput,
} from "../schemas/supplier.schemas";
import { toSupplierAuditValues } from "./supplier-audit.mapper";
import {
  SUPPLIER_ENTITY_NAME,
  SUPPLIER_MODULE,
} from "./supplier-service.constants";
import type { ISupplierTransactionRunner } from "./supplier-transaction.runner";
import { parseRequest } from "@/shared/application/validation";
import { ConflictError } from "@/shared/infrastructure/errors";

export class CreateSupplierService {
  constructor(private readonly transactionRunner: ISupplierTransactionRunner) {}

  async execute(input: CreateSupplierInput): Promise<SupplierDto> {
    const data = parseRequest(CreateSupplierSchema, input);
    const createData = toCreateSupplierData(data);

    return this.transactionRunner.run(async ({ repository, auditLogger }) => {
      const existingCode = await repository.findBySupplierCode(
        createData.supplierCode,
      );

      if (existingCode !== null) {
        throw new ConflictError({
          message: "Supplier code already exists",
          details: { supplierCode: createData.supplierCode },
        });
      }

      const existingPhone = await repository.findByPhone(createData.phone);

      if (existingPhone !== null) {
        throw new ConflictError({
          message: "Phone number already exists",
          details: { phone: createData.phone },
        });
      }

      const supplier = await repository.create(createData);

      await auditLogger.log({
        module: SUPPLIER_MODULE,
        entityName: SUPPLIER_ENTITY_NAME,
        recordId: supplier.id,
        action: "CREATE",
        status: "SUCCESS",
        newValues: toSupplierAuditValues(supplier),
      });

      return toSupplierDto(supplier);
    });
  }
}
