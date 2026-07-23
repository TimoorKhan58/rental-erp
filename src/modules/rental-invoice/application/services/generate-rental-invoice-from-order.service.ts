import { createDispatchRepositoryFromUnitOfWork } from "@/modules/dispatch/infrastructure/factories/create-dispatch.repository";
import { assertRentalOrderEligibleForInvoice } from "@/modules/rental-invoice/domain";
import { createProductRepositoryFromUnitOfWork } from "@/modules/product/infrastructure/factories/create-product.repository";
import { createRentalOrderRepositoryFromUnitOfWork } from "@/modules/rental-order/infrastructure/factories/create-rental-order.repository";
import { syncRentalOrderStatusFromReturns } from "@/modules/rental-order/application/services/sync-rental-order-status-from-returns";
import { createReturnRepositoryFromUnitOfWork } from "@/modules/return/infrastructure/factories/create-return.repository";
import { parseRequest } from "@/shared/application/validation";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";
import {
  ConflictError,
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { ProductId } from "@/shared/domain/ids";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import { toRentalOrderId } from "../mappers/rental-invoice.mapper";
import {
  GenerateRentalInvoiceFromOrderSchema,
  type GenerateRentalInvoiceFromOrderInput,
} from "../schemas/generate-rental-invoice.schema";
import { buildRentalInvoiceLinesFromOrder, appendOptionalInvoiceCharges } from "./build-rental-invoice-lines";
import type { CreateRentalInvoiceService } from "./create-rental-invoice.service";
import { generateNextInvoiceNumber } from "./generate-invoice-number";
import { createRentalInvoiceRepositoryFromUnitOfWork } from "../../infrastructure/factories/create-rental-invoice.repository";

export class GenerateRentalInvoiceFromOrderService {
  constructor(
    private readonly deps: SharedDeps,
    private readonly createRentalInvoiceService: CreateRentalInvoiceService,
  ) {}

  async execute(
    input: GenerateRentalInvoiceFromOrderInput,
  ): Promise<RentalInvoiceDto> {
    const data = parseRequest(GenerateRentalInvoiceFromOrderSchema, input);
    const rentalOrderId = toRentalOrderId(data.rentalOrderId);

    const createInput = await runWithRepositoryUnitOfWork(this.deps, async (context) => {
      const rentalOrderRepository = createRentalOrderRepositoryFromUnitOfWork(context);
      const dispatchRepository = createDispatchRepositoryFromUnitOfWork(context);
      const returnRepository = createReturnRepositoryFromUnitOfWork(context);
      const rentalInvoiceRepository =
        createRentalInvoiceRepositoryFromUnitOfWork(context);
      const productRepository = createProductRepositoryFromUnitOfWork(context);

      await syncRentalOrderStatusFromReturns(rentalOrderId, {
        dispatchRepository,
        returnRepository,
        rentalOrderRepository,
      });

      const rentalOrder = await rentalOrderRepository.findById(rentalOrderId);

      if (rentalOrder === null) {
        throw new NotFoundError({
          message: "Rental order not found",
          details: { rentalOrderId: data.rentalOrderId },
        });
      }

      try {
        assertRentalOrderEligibleForInvoice(rentalOrder.status);
      } catch {
        throw new UnprocessableError({
          message:
            "Rental order must be completed before generating an invoice. Finish all returns first.",
          details: { status: rentalOrder.status },
        });
      }

      const existingInvoices = await rentalInvoiceRepository.findPaged({
        page: 1,
        pageSize: 10,
        rentalOrderId,
        sortOrder: "desc",
      });

      const activeInvoice = existingInvoices.items.find(
        (invoice) => invoice.status !== "VOID",
      );

      if (activeInvoice !== undefined) {
        throw new ConflictError({
          message: "An active invoice already exists for this rental order",
          details: {
            invoiceId: activeInvoice.id,
            invoiceNumber: activeInvoice.invoiceNumber,
          },
        });
      }

      const dispatches = await dispatchRepository.findPaged({
        page: 1,
        pageSize: 100,
        rentalOrderId,
        sortOrder: "desc",
      });

      const returns = (
        await Promise.all(
          dispatches.items.map((dispatch) =>
            returnRepository.findByDispatchId(dispatch.id),
          ),
        )
      ).flat();

      const uniqueProductIds = [
        ...new Set(rentalOrder.items.map((item) => item.productId)),
      ];
      const productRecords = await Promise.all(
        uniqueProductIds.map((productId) =>
          productRepository.findById(productId as ProductId),
        ),
      );
      const productNameById = new Map<string, string>();
      const actualPriceByProductId = new Map<string, number>();
      for (const record of productRecords) {
        if (record) {
          productNameById.set(record.product.id, String(record.product.name));
          if (record.product.replacementCost != null) {
            actualPriceByProductId.set(
              record.product.id,
              Number(record.product.replacementCost),
            );
          }
        }
      }

      const items = appendOptionalInvoiceCharges(
        buildRentalInvoiceLinesFromOrder({
          rentalOrder,
          returns,
          productNameById,
          actualPriceByProductId,
          conditionChargeOverrides: data.conditionChargeOverrides,
        }),
        {
          deliveryCharges: data.deliveryCharges,
          labourCharges: data.labourCharges,
          taxAmount: data.taxAmount,
        },
      );
      if (items.length === 0) {
        throw new UnprocessableError({
          message: "Unable to build invoice lines for this rental order",
        });
      }

      const invoiceNumber = await generateNextInvoiceNumber(rentalInvoiceRepository);
      const invoiceDate = new Date();
      const dueDate = new Date(invoiceDate);
      dueDate.setDate(dueDate.getDate() + 7);

      return {
        invoiceNumber,
        rentalOrderId: data.rentalOrderId,
        customerId: rentalOrder.customerId,
        invoiceDate,
        dueDate,
        notes: `Invoice for rental order ${rentalOrder.orderNumber}`,
        items: items.map((item) => ({
          lineType: item.lineType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sortOrder: item.sortOrder,
          productName: item.productName,
          dailyRate: item.dailyRate,
          numberOfDays: item.numberOfDays,
          damagedQuantity: item.damagedQuantity,
          lostQuantity: item.lostQuantity,
          missingQuantity: item.missingQuantity,
          notes: item.notes,
          lineTotal: item.lineTotal,
        })),
      };
    });

    return this.createRentalInvoiceService.execute({
      invoiceNumber: createInput.invoiceNumber,
      rentalOrderId: createInput.rentalOrderId,
      customerId: String(createInput.customerId),
      invoiceDate: createInput.invoiceDate,
      dueDate: createInput.dueDate,
      notes: createInput.notes,
      items: createInput.items,
    });
  }
}
