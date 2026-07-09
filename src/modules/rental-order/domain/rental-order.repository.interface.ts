import type { RentalOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RentalOrder } from "./rental-order.entity";
import type { RentalOrderListQuery } from "./rental-order-list.query";
import type {
  CreateRentalOrderData,
  UpdateRentalOrderData,
  UpdateRentalOrderReserveData,
} from "./rental-order.types";

export interface IRentalOrderRepository {
  findById(id: RentalOrderId): Promise<RentalOrder | null>;
  findByOrderNumber(orderNumber: string): Promise<RentalOrder | null>;
  findPaged(query: RentalOrderListQuery): Promise<PaginatedResult<RentalOrder>>;
  create(data: CreateRentalOrderData): Promise<RentalOrder>;
  update(id: RentalOrderId, data: UpdateRentalOrderData): Promise<RentalOrder>;
  updateReserve(
    id: RentalOrderId,
    data: UpdateRentalOrderReserveData,
  ): Promise<RentalOrder>;
  updateStatus(
    id: RentalOrderId,
    status: RentalOrder["status"],
  ): Promise<RentalOrder>;
}
