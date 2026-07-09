import type { SupplierDto } from "../dtos/supplier.dto";
import type {
  CreateSupplierInput,
  SupplierIdParamInput,
  UpdateSupplierInput,
} from "../schemas/supplier.schemas";
import type { ListSuppliersInput } from "../schemas/list-suppliers.schema";
import type { ExecutionContext } from "@/shared/application/context";
import type { PaginatedResult } from "@/shared/domain/pagination";

export interface SupplierApplicationServices {
  getSupplierById: {
    execute(input: SupplierIdParamInput): Promise<SupplierDto>;
  };
  listSuppliers: {
    execute(input: ListSuppliersInput): Promise<PaginatedResult<SupplierDto>>;
  };
  createSupplier: {
    execute(input: CreateSupplierInput): Promise<SupplierDto>;
  };
  updateSupplier: {
    execute(
      params: SupplierIdParamInput,
      input: UpdateSupplierInput,
    ): Promise<SupplierDto>;
  };
  deleteSupplier: {
    execute(input: SupplierIdParamInput): Promise<void>;
  };
}

export type SupplierServiceResolver = (
  ctx: ExecutionContext,
) => SupplierApplicationServices;
