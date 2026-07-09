import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import { NotFoundError } from "@/shared/infrastructure/errors";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import {
  toRentalInvoiceDto,
  toRentalInvoiceId,
} from "../mappers/rental-invoice.mapper";
import {
  RentalInvoiceIdParamSchema,
  type RentalInvoiceIdParamInput,
} from "../schemas/rental-invoice.schemas";

export class GetRentalInvoiceByIdService {
  constructor(
    private readonly rentalInvoiceRepository: IRentalInvoiceRepository,
  ) {}

  async execute(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto> {
    const { id } = parseRequest(RentalInvoiceIdParamSchema, params);

    const invoice = await this.rentalInvoiceRepository.findById(
      toRentalInvoiceId(id),
    );

    if (invoice === null) {
      throw new NotFoundError({
        message: "Rental invoice not found",
        details: { id },
      });
    }

    return toRentalInvoiceDto(invoice);
  }
}
