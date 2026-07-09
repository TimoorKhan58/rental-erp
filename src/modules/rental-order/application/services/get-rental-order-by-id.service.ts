import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";

import type { RentalOrderDto } from "../dtos/rental-order.dto";
import {
  toRentalOrderDto,
  toRentalOrderId,
} from "../mappers/rental-order.mapper";
import {
  RentalOrderIdParamSchema,
  type RentalOrderIdParamInput,
} from "../schemas/rental-order.schemas";

export class GetRentalOrderByIdService {
  constructor(private readonly repository: IRentalOrderRepository) {}

  async execute(params: RentalOrderIdParamInput): Promise<RentalOrderDto> {
    const { id } = parseRequest(RentalOrderIdParamSchema, params);
    const order = await this.repository.findById(toRentalOrderId(id));

    if (order === null) {
      throw new NotFoundError({
        message: "Rental order not found",
        details: { id },
      });
    }

    return toRentalOrderDto(order);
  }
}
