import type { CreateRentalInvoiceData } from "@/modules/rental-invoice/domain/rental-invoice.types";
import type { IRentalOrderRepository } from "@/modules/rental-order/domain/rental-order.repository.interface";
import { ConflictError } from "@/shared/infrastructure/errors";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import { toRentalInvoiceDto } from "../mappers/rental-invoice.mapper";
import { toRentalInvoiceAuditValues } from "./rental-invoice-audit.mapper";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "./rental-invoice-service.constants";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";

export interface RentalInvoiceCreateScope {
  readonly rentalInvoiceRepository: IRentalInvoiceRepository;
  readonly rentalOrderRepository: IRentalOrderRepository;
  readonly auditLogger: IAuditLogger;
}

export async function createRentalInvoiceInWriteScope(
  scope: RentalInvoiceCreateScope,
  createData: CreateRentalInvoiceData,
): Promise<RentalInvoiceDto> {
  await scope.rentalOrderRepository.lockForInvoiceCommand(
    createData.rentalOrderId,
  );

  const activeInvoice =
    await scope.rentalInvoiceRepository.findActiveByRentalOrderId(
      createData.rentalOrderId,
    );

  if (activeInvoice !== null) {
    throw new ConflictError({
      message: "An active invoice already exists for this rental order",
      details: {
        invoiceId: activeInvoice.id,
        invoiceNumber: activeInvoice.invoiceNumber,
      },
    });
  }

  const existing = await scope.rentalInvoiceRepository.findByInvoiceNumber(
    createData.invoiceNumber,
  );

  if (existing !== null) {
    throw new ConflictError({
      message: "Invoice number already exists",
      details: { invoiceNumber: createData.invoiceNumber },
    });
  }

  const invoice = await scope.rentalInvoiceRepository.create(createData);

  await scope.auditLogger.log({
    module: RENTAL_INVOICE_MODULE,
    entityName: RENTAL_INVOICE_ENTITY_NAME,
    recordId: invoice.id,
    action: "CREATE",
    status: "SUCCESS",
    newValues: toRentalInvoiceAuditValues(invoice),
  });

  return toRentalInvoiceDto(invoice);
}
