import type { PaginatedResult } from "@/shared/domain/pagination";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import type {
  CreateRentalInvoiceInput,
  RentalInvoiceIdParamInput,
  UpdateRentalInvoiceInput,
} from "../schemas/rental-invoice.schemas";
import type { ListRentalInvoicesInput } from "../schemas/list-rental-invoices.schema";
import type { ConvertMissingToLossService } from "./convert-missing-to-loss.service";
import type { CreateRentalInvoiceService } from "./create-rental-invoice.service";
import type { GenerateRentalInvoiceFromOrderService } from "./generate-rental-invoice-from-order.service";
import type { GenerateRentalInvoiceFromOrderInput } from "../schemas/generate-rental-invoice.schema";
import type { GetRentalInvoiceByIdService } from "./get-rental-invoice-by-id.service";
import type { IssueRentalInvoiceService } from "./issue-rental-invoice.service";
import type { ListRentalInvoicesService } from "./list-rental-invoices.service";
import type { UpdateRentalInvoiceService } from "./update-rental-invoice.service";
import type { VoidRentalInvoiceService } from "./void-rental-invoice.service";

export interface RentalInvoiceApplicationServices {
  getRentalInvoiceById: GetRentalInvoiceByIdService;
  listRentalInvoices: ListRentalInvoicesService;
  createRentalInvoice: CreateRentalInvoiceService;
  generateRentalInvoiceFromOrder: GenerateRentalInvoiceFromOrderService;
  updateRentalInvoice: UpdateRentalInvoiceService;
  issueRentalInvoice: IssueRentalInvoiceService;
  voidRentalInvoice: VoidRentalInvoiceService;
  convertMissingToLoss: ConvertMissingToLossService;
}

export type RentalInvoiceServiceResolver = (
  ctx: import("@/shared/application/context").ExecutionContext,
) => RentalInvoiceApplicationServices;

export interface IRentalInvoiceService {
  getById(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto>;
  list(input: ListRentalInvoicesInput): Promise<PaginatedResult<RentalInvoiceDto>>;
  create(input: CreateRentalInvoiceInput): Promise<RentalInvoiceDto>;
  generateFromOrder(
    input: GenerateRentalInvoiceFromOrderInput,
  ): Promise<RentalInvoiceDto>;
  update(
    params: RentalInvoiceIdParamInput,
    input: UpdateRentalInvoiceInput,
  ): Promise<RentalInvoiceDto>;
  issue(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto>;
  void(params: RentalInvoiceIdParamInput): Promise<RentalInvoiceDto>;
}
