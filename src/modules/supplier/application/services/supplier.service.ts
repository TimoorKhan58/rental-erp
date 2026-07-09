import type { PaginatedResult } from "@/shared/domain/pagination";

import type { SupplierDto } from "../dtos/supplier.dto";
import type {
  CreateSupplierInput,
  SupplierIdParamInput,
  UpdateSupplierInput,
} from "../schemas/supplier.schemas";
import type { ListSuppliersInput } from "../schemas/list-suppliers.schema";
import { CreateSupplierService } from "./create-supplier.service";
import { DeleteSupplierService } from "./delete-supplier.service";
import { GetSupplierByIdService } from "./get-supplier-by-id.service";
import { ListSuppliersService } from "./list-suppliers.service";
import { UpdateSupplierService } from "./update-supplier.service";

export interface ISupplierService {
  getById(input: SupplierIdParamInput): Promise<SupplierDto>;
  list(input: ListSuppliersInput): Promise<PaginatedResult<SupplierDto>>;
  create(input: CreateSupplierInput): Promise<SupplierDto>;
  update(
    input: SupplierIdParamInput,
    data: UpdateSupplierInput,
  ): Promise<SupplierDto>;
  delete(input: SupplierIdParamInput): Promise<void>;
}

export class SupplierService implements ISupplierService {
  constructor(
    private readonly getSupplierByIdService: GetSupplierByIdService,
    private readonly listSuppliersService: ListSuppliersService,
    private readonly createSupplierService: CreateSupplierService,
    private readonly updateSupplierService: UpdateSupplierService,
    private readonly deleteSupplierService: DeleteSupplierService,
  ) {}

  getById(input: SupplierIdParamInput): Promise<SupplierDto> {
    return this.getSupplierByIdService.execute(input);
  }

  list(input: ListSuppliersInput): Promise<PaginatedResult<SupplierDto>> {
    return this.listSuppliersService.execute(input);
  }

  create(input: CreateSupplierInput): Promise<SupplierDto> {
    return this.createSupplierService.execute(input);
  }

  update(
    input: SupplierIdParamInput,
    data: UpdateSupplierInput,
  ): Promise<SupplierDto> {
    return this.updateSupplierService.execute(input, data);
  }

  delete(input: SupplierIdParamInput): Promise<void> {
    return this.deleteSupplierService.execute(input);
  }
}
