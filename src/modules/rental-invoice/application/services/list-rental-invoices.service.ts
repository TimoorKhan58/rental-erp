import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import { parseRequest } from "@/shared/application/validation";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import { toRentalInvoiceDto, toRentalInvoiceListQuery } from "../mappers/rental-invoice.mapper";
import {
  ListRentalInvoicesSchema,
  type ListRentalInvoicesInput,
} from "../schemas/list-rental-invoices.schema";

export class ListRentalInvoicesService {
  constructor(
    private readonly rentalInvoiceRepository: IRentalInvoiceRepository,
  ) {}

  async execute(
    input: ListRentalInvoicesInput,
  ): Promise<PaginatedResult<RentalInvoiceDto>> {
    const query = parseRequest(ListRentalInvoicesSchema, input);
    const listQuery = toRentalInvoiceListQuery(query);
    const result = await this.rentalInvoiceRepository.findPaged(listQuery);

    return {
      ...result,
      items: result.items.map(toRentalInvoiceDto),
    };
  }
}
