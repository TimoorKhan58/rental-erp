import type { DispatchId, RentalOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { Dispatch } from "./dispatch.entity";
import type { DispatchListQuery } from "./dispatch-list.query";
import type {
  CreateDispatchData,
  UpdateDispatchData,
} from "./dispatch.types";

export interface IDispatchRepository {
  findById(id: DispatchId): Promise<Dispatch | null>;
  findByDispatchNumber(dispatchNumber: string): Promise<Dispatch | null>;
  findPaged(query: DispatchListQuery): Promise<PaginatedResult<Dispatch>>;
  create(data: CreateDispatchData): Promise<Dispatch>;
  update(id: DispatchId, data: UpdateDispatchData): Promise<Dispatch>;
  updateStatus(
    id: DispatchId,
    status: Dispatch["status"],
    timestamps?: {
      readyAt?: Date | null;
      dispatchedAt?: Date | null;
      completedAt?: Date | null;
    },
  ): Promise<Dispatch>;
}

export interface IDispatchRentalOrderLookup {
  findById(id: RentalOrderId): Promise<{
    id: RentalOrderId;
    status: string;
    warehouseId: string;
    customerId: string;
    orderNumber: string;
    items: Array<{
      id: string;
      productId: string;
      quantity: number;
      reservedQuantity: number;
    }>;
  } | null>;
}
