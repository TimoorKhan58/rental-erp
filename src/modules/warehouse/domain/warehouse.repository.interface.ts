import type { WarehouseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Warehouse } from "./warehouse.entity";
import type { WarehouseListQuery } from "./warehouse-list.query";
import type { CreateWarehouseData, UpdateWarehouseData } from "./warehouse.types";

export interface IWarehouseRepository {
  findById(id: WarehouseId): Promise<Warehouse | null>;
  findByWarehouseCode(warehouseCode: string): Promise<Warehouse | null>;
  findPaged(query: WarehouseListQuery): Promise<PaginatedResult<Warehouse>>;
  exists(id: WarehouseId): Promise<boolean>;
  create(data: CreateWarehouseData): Promise<Warehouse>;
  update(id: WarehouseId, data: UpdateWarehouseData): Promise<Warehouse>;
  delete(id: WarehouseId): Promise<void>;
}
