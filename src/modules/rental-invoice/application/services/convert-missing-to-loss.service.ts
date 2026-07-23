import { createDispatchRepositoryFromUnitOfWork } from "@/modules/dispatch/infrastructure/factories/create-dispatch.repository";
import { createProductRepositoryFromUnitOfWork } from "@/modules/product/infrastructure/factories/create-product.repository";
import { createRentalOrderRepositoryFromUnitOfWork } from "@/modules/rental-order/infrastructure/factories/create-rental-order.repository";
import { createReturnRepositoryFromUnitOfWork } from "@/modules/return/infrastructure/factories/create-return.repository";
import { parseRequest } from "@/shared/application/validation";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { runWithRepositoryUnitOfWork } from "@/shared/infrastructure/database";
import {
  NotFoundError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";
import type { ProductId } from "@/shared/domain/ids";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import {
  toRentalInvoiceDto,
  toRentalInvoiceId,
} from "../mappers/rental-invoice.mapper";
import { RentalInvoiceIdParamSchema } from "../schemas/rental-invoice.schemas";
import {
  appendOptionalInvoiceCharges,
  buildRentalInvoiceLinesFromOrder,
} from "./build-rental-invoice-lines";
import { createRentalInvoiceRepositoryFromUnitOfWork } from "../../infrastructure/factories/create-rental-invoice.repository";

/**
 * Converts tracked missing quantities to loss (charges actual/replacement price).
 * Updates completed returns and rebuilds draft invoice condition lines.
 */
export class ConvertMissingToLossService {
  constructor(private readonly deps: SharedDeps) {}

  async execute(params: { id: string }): Promise<RentalInvoiceDto> {
    const { id } = parseRequest(RentalInvoiceIdParamSchema, params);
    const invoiceId = toRentalInvoiceId(id);

    return runWithRepositoryUnitOfWork(this.deps, async (context) => {
      const rentalInvoiceRepository =
        createRentalInvoiceRepositoryFromUnitOfWork(context);
      const rentalOrderRepository = createRentalOrderRepositoryFromUnitOfWork(context);
      const dispatchRepository = createDispatchRepositoryFromUnitOfWork(context);
      const returnRepository = createReturnRepositoryFromUnitOfWork(context);
      const productRepository = createProductRepositoryFromUnitOfWork(context);

      const invoice = await rentalInvoiceRepository.findById(invoiceId);

      if (invoice === null) {
        throw new NotFoundError({
          message: "Rental invoice not found",
          details: { id },
        });
      }

      if (invoice.status !== "DRAFT") {
        throw new UnprocessableError({
          message:
            "Missing items can only be converted to loss while the invoice is still a draft. Void and regenerate if needed.",
          details: { status: invoice.status },
        });
      }

      const hasMissing = invoice.items.some((item) => item.missingQuantity > 0);

      if (!hasMissing) {
        throw new UnprocessableError({
          message: "This invoice has no missing items to convert",
        });
      }

      const rentalOrder = await rentalOrderRepository.findById(invoice.rentalOrderId);

      if (rentalOrder === null) {
        throw new NotFoundError({
          message: "Rental order not found",
          details: { rentalOrderId: invoice.rentalOrderId },
        });
      }

      const dispatches = await dispatchRepository.findPaged({
        page: 1,
        pageSize: 100,
        rentalOrderId: invoice.rentalOrderId,
        sortOrder: "desc",
      });

      const returns = (
        await Promise.all(
          dispatches.items.map((dispatch) =>
            returnRepository.findByDispatchId(dispatch.id),
          ),
        )
      ).flat();

      let convertedQty = 0;

      for (const returnRecord of returns) {
        if (returnRecord.status === "CANCELLED") {
          continue;
        }

        const hasReturnMissing = returnRecord.items.some(
          (item) => item.missingQuantity > 0,
        );

        if (!hasReturnMissing) {
          continue;
        }

        const nextItems = returnRecord.items.map((item) => {
          if (item.missingQuantity <= 0) {
            return item;
          }

          convertedQty += item.missingQuantity;

          return {
            ...item,
            lostQuantity: item.lostQuantity + item.missingQuantity,
            missingQuantity: 0,
          };
        });

        await returnRepository.updateStatus(returnRecord.id, {
          status: returnRecord.status,
          items: nextItems,
        });
      }

      if (convertedQty === 0) {
        throw new UnprocessableError({
          message:
            "No missing quantities found on returns for this order. Update the return inspection first.",
        });
      }

      const refreshedReturns = (
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

      const rebuiltCore = buildRentalInvoiceLinesFromOrder({
        rentalOrder,
        returns: refreshedReturns,
        productNameById,
        actualPriceByProductId,
      });

      const deliveryCharges = invoice.items
        .filter((item) => item.lineType === "DELIVERY_CHARGE")
        .reduce((sum, item) => sum + item.lineTotal, 0);
      const labourCharges = invoice.items
        .filter((item) => item.lineType === "LABOUR_CHARGE")
        .reduce((sum, item) => sum + item.lineTotal, 0);
      const taxAmount = invoice.items
        .filter((item) => item.lineType === "TAX")
        .reduce((sum, item) => sum + item.lineTotal, 0);

      const nextItems = appendOptionalInvoiceCharges(rebuiltCore, {
        deliveryCharges,
        labourCharges,
        taxAmount,
      });

      const updated = await rentalInvoiceRepository.update(invoiceId, {
        notes: invoice.notes,
        items: nextItems.map((item, index) => ({
          ...item,
          sortOrder: index,
        })),
      });

      return toRentalInvoiceDto(updated);
    });
  }
}
