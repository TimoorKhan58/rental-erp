import type { ReturnDto } from "@/modules/return/application/dtos/return.dto";
import type { PaginatedResult, PaginationMeta } from "@/shared/domain/pagination";

export interface ReturnItemResponse {
  id: string;
  rentalOrderItemId: string;
  dispatchItemId: string | null;
  returnedQuantity: number;
  goodQuantity: number;
  damagedQuantity: number;
  lostQuantity: number;
  missingQuantity: number;
  notes: string | null;
}

export interface ReturnResponse {
  id: string;
  returnNumber: string;
  rentalOrderId: string;
  dispatchId: string;
  returnDate: string;
  remarks: string | null;
  status: ReturnDto["status"];
  receivedAt: string | null;
  inspectedAt: string | null;
  completedAt: string | null;
  items: ReturnItemResponse[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnListResponse {
  items: ReturnResponse[];
  meta: PaginationMeta;
}

export function toReturnResponse(dto: ReturnDto): ReturnResponse {
  return {
    id: dto.id,
    returnNumber: dto.returnNumber,
    rentalOrderId: dto.rentalOrderId,
    dispatchId: dto.dispatchId,
    returnDate: dto.returnDate,
    remarks: dto.remarks,
    status: dto.status,
    receivedAt: dto.receivedAt,
    inspectedAt: dto.inspectedAt,
    completedAt: dto.completedAt,
    items: dto.items.map((item) => ({
      id: item.id,
      rentalOrderItemId: item.rentalOrderItemId,
      dispatchItemId: item.dispatchItemId,
      returnedQuantity: item.returnedQuantity,
      goodQuantity: item.goodQuantity,
      damagedQuantity: item.damagedQuantity,
      lostQuantity: item.lostQuantity,
      missingQuantity: item.missingQuantity,
      notes: item.notes,
    })),
    createdById: dto.createdById,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toReturnListResponse(
  result: PaginatedResult<ReturnDto>,
): ReturnListResponse {
  return {
    items: result.items.map(toReturnResponse),
    meta: result.meta,
  };
}
