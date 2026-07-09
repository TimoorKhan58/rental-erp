import type { SupplierId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Supplier } from "./supplier.entity";
import type { SupplierListQuery } from "./supplier-list.query";
import type { CreateSupplierData, UpdateSupplierData } from "./supplier.types";

export interface ISupplierRepository {
  findById(id: SupplierId): Promise<Supplier | null>;
  findByPhone(phone: string): Promise<Supplier | null>;
  findBySupplierCode(supplierCode: string): Promise<Supplier | null>;
  findPaged(query: SupplierListQuery): Promise<PaginatedResult<Supplier>>;
  exists(id: SupplierId): Promise<boolean>;
  create(data: CreateSupplierData): Promise<Supplier>;
  update(id: SupplierId, data: UpdateSupplierData): Promise<Supplier>;
  delete(id: SupplierId): Promise<void>;
}
