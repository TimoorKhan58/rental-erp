import type { RentalInvoiceApplicationServices as RentalInvoiceApplicationServicesBase } from "@/modules/rental-invoice/application/services/rental-invoice-application-services.interface";
import { ConvertMissingToLossService } from "@/modules/rental-invoice/application/services/convert-missing-to-loss.service";
import { CreateRentalInvoiceService } from "@/modules/rental-invoice/application/services/create-rental-invoice.service";
import {
  GenerateRentalInvoiceFromOrderService,
  type IGenerateRentalInvoiceFromOrderScopeFactory,
} from "@/modules/rental-invoice/application/services/generate-rental-invoice-from-order.service";
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
import { createDispatchRepositoryFromUnitOfWork } from "@/modules/dispatch/infrastructure/factories/create-dispatch.repository";
import { createProductRepositoryFromUnitOfWork } from "@/modules/product/infrastructure/factories/create-product.repository";
import { createRentalOrderRepositoryFromUnitOfWork } from "@/modules/rental-order/infrastructure/factories/create-rental-order.repository";
import { createReturnRepositoryFromUnitOfWork } from "@/modules/return/infrastructure/factories/create-return.repository";

import { createRentalInvoiceRepositoryFromSharedDeps } from "./create-rental-invoice.repository";
import {
  createRentalInvoiceTransactionRunner,
  createRentalInvoiceTransactionRunnerFromUnitOfWorkContext,
} from "./create-rental-invoice-transaction.runner";
import { createRentalInvoiceRepositoryFromUnitOfWork } from "./create-rental-invoice.repository";

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
  const generateFromOrderScopeFactory: IGenerateRentalInvoiceFromOrderScopeFactory = {
    create: (context, options) => ({
      rentalOrderRepository: createRentalOrderRepositoryFromUnitOfWork(context),
      dispatchRepository: createDispatchRepositoryFromUnitOfWork(context),
      returnRepository: createReturnRepositoryFromUnitOfWork(context),
      rentalInvoiceRepository: createRentalInvoiceRepositoryFromUnitOfWork(context),
      productRepository: createProductRepositoryFromUnitOfWork(context),
      transactionRunner:
        createRentalInvoiceTransactionRunnerFromUnitOfWorkContext(context, {
          userId: options.userId,
        }),
    }),
  };
  const generateRentalInvoiceFromOrder = new GenerateRentalInvoiceFromOrderService(
    deps,
    createRentalInvoice,
    generateFromOrderScopeFactory,
    userId,
  );
  const updateRentalInvoice = new UpdateRentalInvoiceService(transactionRunner);
  const issueRentalInvoice = new IssueRentalInvoiceService(transactionRunner);
  const voidRentalInvoice = new VoidRentalInvoiceService(transactionRunner);
  const convertMissingToLoss = new ConvertMissingToLossService(deps);

  return {
    getRentalInvoiceById,
    listRentalInvoices,
    createRentalInvoice,
    generateRentalInvoiceFromOrder,
    updateRentalInvoice,
    issueRentalInvoice,
    voidRentalInvoice,
    convertMissingToLoss,
    rentalInvoiceService: new RentalInvoiceService(
      getRentalInvoiceById,
      listRentalInvoices,
      createRentalInvoice,
      generateRentalInvoiceFromOrder,
      updateRentalInvoice,
      issueRentalInvoice,
      voidRentalInvoice,
    ),
  };
}
