import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import type {
  CreateRentalInvoiceInput,
  RentalInvoiceIdParamInput,
  UpdateRentalInvoiceInput,
} from "../schemas/rental-invoice.schemas";
import type { ListRentalInvoicesInput } from "../schemas/list-rental-invoices.schema";
import type { IRentalInvoiceService } from "./rental-invoice-application-services.interface";
import type { CreateRentalInvoiceService } from "./create-rental-invoice.service";
import type { GenerateRentalInvoiceFromOrderService } from "./generate-rental-invoice-from-order.service";
import type { GenerateRentalInvoiceFromOrderInput } from "../schemas/generate-rental-invoice.schema";
import type { GetRentalInvoiceByIdService } from "./get-rental-invoice-by-id.service";
import type { IssueRentalInvoiceService } from "./issue-rental-invoice.service";
import type { ListRentalInvoicesService } from "./list-rental-invoices.service";
import type { UpdateRentalInvoiceService } from "./update-rental-invoice.service";
import type { VoidRentalInvoiceService } from "./void-rental-invoice.service";

export class RentalInvoiceService implements IRentalInvoiceService {
  constructor(
    private readonly getRentalInvoiceById: GetRentalInvoiceByIdService,
    private readonly listRentalInvoices: ListRentalInvoicesService,
    private readonly createRentalInvoice: CreateRentalInvoiceService,
    private readonly generateRentalInvoiceFromOrder: GenerateRentalInvoiceFromOrderService,
    private readonly updateRentalInvoice: UpdateRentalInvoiceService,
    private readonly issueRentalInvoice: IssueRentalInvoiceService,
    private readonly voidRentalInvoice: VoidRentalInvoiceService,
  ) {}

  getById(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto> {
    return this.getRentalInvoiceById.execute(params);
  }

  list(input: ListRentalInvoicesInput): Promise<PaginatedResult<RentalInvoiceDto>> {
    return this.listRentalInvoices.execute(input);
  }

  create(input: CreateRentalInvoiceInput): Promise<RentalInvoiceDto> {
    return this.createRentalInvoice.execute(input);
  }

  generateFromOrder(
    input: GenerateRentalInvoiceFromOrderInput,
  ): Promise<RentalInvoiceDto> {
    return this.generateRentalInvoiceFromOrder.execute(input);
  }

  update(
    params: RentalInvoiceIdParamInput,
    input: UpdateRentalInvoiceInput,
  ): Promise<RentalInvoiceDto> {
    return this.updateRentalInvoice.execute(params, input);
  }

  issue(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto> {
    return this.issueRentalInvoice.execute(params);
  }

  void(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto> {
    return this.voidRentalInvoice.execute(params);
  }
}
