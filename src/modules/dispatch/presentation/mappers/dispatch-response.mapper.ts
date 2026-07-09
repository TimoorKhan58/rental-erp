import type { DispatchDto } from "@/modules/dispatch/application/dtos/dispatch.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface DispatchItemResponse {
  id: string;
  productId: string;
  rentalOrderItemId: string | null;
  quantity: number;
  notes: string | null;
}

export interface DispatchResponse {
  id: string;
  dispatchNumber: string;
  rentalOrderId: string;
  dispatchDate: string;
  deliveryMethod: DispatchDto["deliveryMethod"];
  vehicleNumber: string | null;
  driverName: string | null;
  driverPhone: string | null;
  deliveryAddress: string;
  remarks: string | null;
  status: DispatchDto["status"];
  readyAt: string | null;
  dispatchedAt: string | null;
  completedAt: string | null;
  items: DispatchItemResponse[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface DispatchListResponse {
  items: DispatchResponse[];
  meta: PaginationMeta;
}

export function toDispatchResponse(dto: DispatchDto): DispatchResponse {
  return {
    id: dto.id,
    dispatchNumber: dto.dispatchNumber,
    rentalOrderId: dto.rentalOrderId,
    dispatchDate: dto.dispatchDate,
    deliveryMethod: dto.deliveryMethod,
    vehicleNumber: dto.vehicleNumber,
    driverName: dto.driverName,
    driverPhone: dto.driverPhone,
    deliveryAddress: dto.deliveryAddress,
    remarks: dto.remarks,
    status: dto.status,
    readyAt: dto.readyAt,
    dispatchedAt: dto.dispatchedAt,
    completedAt: dto.completedAt,
    items: dto.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      rentalOrderItemId: item.rentalOrderItemId,
      quantity: item.quantity,
      notes: item.notes,
    })),
    createdById: dto.createdById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toDispatchListResponse(
  result: PaginatedResult<DispatchDto>,
): DispatchListResponse {
  return {
    items: result.items.map(toDispatchResponse),
    meta: result.meta,
  };
}
