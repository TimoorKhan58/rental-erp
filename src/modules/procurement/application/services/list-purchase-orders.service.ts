import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { PurchaseOrderDto } from "../dtos/purchase-order.dto";
import { toPurchaseOrderListQuery } from "../mappers/purchase-order-list.mapper";
import { toPurchaseOrderDto } from "../mappers/purchase-order.mapper";
import {
  ListPurchaseOrdersSchema,
  type ListPurchaseOrdersInput,
} from "../schemas/list-purchase-orders.schema";
import type { IPurchaseOrderRepository } from "@/modules/procurement/domain/purchase-order.repository.interface";

export class ListPurchaseOrdersService {
  constructor(private readonly repository: IPurchaseOrderRepository) {}

  async execute(
    input: ListPurchaseOrdersInput,
  ): Promise<PaginatedResult<PurchaseOrderDto>> {
    const query = toPurchaseOrderListQuery(parseRequest(ListPurchaseOrdersSchema, input));
    const result = await this.repository.findPaged(query);

    return {
      ...result,
      items: result.items.map(toPurchaseOrderDto),
    };
  }
}
