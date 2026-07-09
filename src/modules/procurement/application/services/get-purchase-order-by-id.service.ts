import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import {
  toPurchaseOrderDto,
  toPurchaseOrderId,
} from "../mappers/purchase-order.mapper";
import {
  PurchaseOrderIdParamSchema,
  type PurchaseOrderIdParamInput,
} from "../schemas/purchase-order.schemas";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";

export class GetPurchaseOrderByIdService {
  constructor(private readonly repository: IPurchaseOrderRepository) {}

  async execute(params: PurchaseOrderIdParamInput): Promise<PurchaseOrderDto> {
    const { id } = parseRequest(PurchaseOrderIdParamSchema, params);
    const order = await this.repository.findById(toPurchaseOrderId(id));

    if (order === null) {
      throw new NotFoundError({
        message: "Purchase order not found",
        details: { id },
      });
    }

    return toPurchaseOrderDto(order);
  }
}
