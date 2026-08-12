import type { PaginatedResult } from "@/shared/domain/pagination";
import { parseRequest } from "@/shared/application/validation";

import type { ExternalRentalAgreementDto } from "../dtos/external-rental.dto";
import { toExternalRentalListQuery } from "../mappers/external-rental-list.mapper";
import { toExternalRentalAgreementDto } from "../mappers/external-rental.mapper";
import {
  ListExternalRentalsSchema,
  type ListExternalRentalsInput,
} from "../schemas/list-external-rentals.schema";
import type { IExternalRentalRepository } from "@/modules/external-rental/domain";

export class ListExternalRentalsService {
  constructor(private readonly repository: IExternalRentalRepository) {}

  async execute(
    input: ListExternalRentalsInput,
  ): Promise<PaginatedResult<ExternalRentalAgreementDto>> {
    const query = toExternalRentalListQuery(
      parseRequest(ListExternalRentalsSchema, input),
    );
    const result = await this.repository.findPaged(query);

    return {
      ...result,
      items: result.items.map(toExternalRentalAgreementDto),
    };
  }
}
