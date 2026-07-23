import type { RentalOrderDto } from "@/modules/rental-order/application/dtos/rental-order.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface RentalOrderItemResponse {
  id: string;
  productId: string;
  quantity: number;
  dailyRate: number;
  reservedQuantity: number;
  startDate: string;
  endDate: string;
  numberOfDays: number;
}

export interface RentalOrderResponse {
  id: string;
  orderNumber: string;
  customerId: string;
  warehouseId: string;
  status: RentalOrderDto["status"];
  startDate: string;
  endDate: string;
  remarks: string | null;
  items: RentalOrderItemResponse[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface RentalOrderListResponse {
  items: RentalOrderResponse[];
  meta: PaginationMeta;
}

export function toRentalOrderResponse(dto: RentalOrderDto): RentalOrderResponse {
  return {
    id: dto.id,
    orderNumber: dto.orderNumber,
    customerId: dto.customerId,
    warehouseId: dto.warehouseId,
    status: dto.status,
    startDate: dto.startDate,
    endDate: dto.endDate,
    remarks: dto.remarks,
    items: dto.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      dailyRate: item.dailyRate,
      reservedQuantity: item.reservedQuantity,
      startDate: item.startDate,
      endDate: item.endDate,
      numberOfDays: item.numberOfDays,
    })),
    createdById: dto.createdById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toRentalOrderListResponse(
  result: PaginatedResult<RentalOrderDto>,
): RentalOrderListResponse {
  return {
    items: result.items.map(toRentalOrderResponse),
    meta: result.meta,
  };
}
