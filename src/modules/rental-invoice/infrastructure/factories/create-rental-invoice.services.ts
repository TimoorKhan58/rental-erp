import type { RentalInvoiceApplicationServices as RentalInvoiceApplicationServicesBase } from "@/modules/rental-invoice/application/services/rental-invoice-application-services.interface";
import { CreateRentalInvoiceService } from "@/modules/rental-invoice/application/services/create-rental-invoice.service";
import { GetRentalInvoiceByIdService } from "@/modules/rental-invoice/application/services/get-rental-invoice-by-id.service";
import { IssueRentalInvoiceService } from "@/modules/rental-invoice/application/services/issue-rental-invoice.service";
import { ListRentalInvoicesService } from "@/modules/rental-invoice/application/services/list-rental-invoices.service";
import {
  RentalInvoiceService,
} from "@/modules/rental-invoice/application/services/rental-invoice.service";
import type { IRentalInvoiceService } from "@/modules/rental-invoice/application/services/rental-invoice-application-services.interface";
import { UpdateRentalInvoiceService } from "@/modules/rental-invoice/application/services/update-rental-invoice.service";
import { VoidRentalInvoiceService } from "@/modules/rental-invoice/application/services/void-rental-invoice.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createRentalInvoiceRepositoryFromSharedDeps } from "./create-rental-invoice.repository";
import { createRentalInvoiceTransactionRunner } from "./create-rental-invoice-transaction.runner";

export type { RentalInvoiceApplicationServicesBase as RentalInvoiceApplicationServices };

export interface WiredRentalInvoiceApplicationServices
  extends RentalInvoiceApplicationServicesBase {
  rentalInvoiceService: IRentalInvoiceService;
}

export function createRentalInvoiceApplicationServices(
  deps: SharedDeps,
  userId?: string,
): WiredRentalInvoiceApplicationServices {
  const repository = createRentalInvoiceRepositoryFromSharedDeps(deps);
  const transactionRunner = createRentalInvoiceTransactionRunner(deps, {
    userId,
  });

  const getRentalInvoiceById = new GetRentalInvoiceByIdService(repository);
  const listRentalInvoices = new ListRentalInvoicesService(repository);
  const createRentalInvoice = new CreateRentalInvoiceService(transactionRunner);
  const updateRentalInvoice = new UpdateRentalInvoiceService(transactionRunner);
  const issueRentalInvoice = new IssueRentalInvoiceService(transactionRunner);
  const voidRentalInvoice = new VoidRentalInvoiceService(transactionRunner);

  return {
    getRentalInvoiceById,
    listRentalInvoices,
    createRentalInvoice,
    updateRentalInvoice,
    issueRentalInvoice,
    voidRentalInvoice,
    rentalInvoiceService: new RentalInvoiceService(
      getRentalInvoiceById,
      listRentalInvoices,
      createRentalInvoice,
      updateRentalInvoice,
      issueRentalInvoice,
      voidRentalInvoice,
    ),
  };
}
