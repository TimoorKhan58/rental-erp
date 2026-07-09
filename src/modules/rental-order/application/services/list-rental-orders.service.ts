import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import { toRentalOrderListQuery } from "../mappers/rental-order-list.mapper";
import { toRentalOrderDto } from "../mappers/rental-order.mapper";
import {
  ListRentalOrdersSchema,
  type ListRentalOrdersInput,
} from "../schemas/list-rental-orders.schema";

export class ListRentalOrdersService {
  constructor(private readonly repository: IRentalOrderRepository) {}

  async execute(
    input: ListRentalOrdersInput,
  ): Promise<PaginatedResult<RentalOrderDto>> {
    const query = toRentalOrderListQuery(
      parseRequest(ListRentalOrdersSchema, input),
    );
    const result = await this.repository.findPaged(query);

    return {
      ...result,
      items: result.items.map(toRentalOrderDto),
    };
  }
}
