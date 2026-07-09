import {
  RentalInvoice,
  RentalInvoiceInvariantError,
} from "@/modules/rental-invoice/domain";
import { parseRequest } from "@/shared/application/validation";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
} from "@/shared/infrastructure/errors";

import type { RentalInvoiceDto } from "../dtos/rental-invoice.dto";
import {
  toCreateRentalInvoiceData,
  toCustomerId,
  toRentalInvoiceDto,
  toRentalOrderId,
  toUserId,
} from "../mappers/rental-invoice.mapper";
import {
  CreateRentalInvoiceSchema,
  type CreateRentalInvoiceInput,
} from "../schemas/rental-invoice.schemas";
import { toRentalInvoiceAuditValues } from "./rental-invoice-audit.mapper";
import {
  validateCustomerForInvoice,
  validateRentalOrderForInvoice,
} from "./rental-invoice-rental-order.validation";
import {
  RENTAL_INVOICE_ENTITY_NAME,
  RENTAL_INVOICE_MODULE,
} from "./rental-invoice-service.constants";
import type { IRentalInvoiceTransactionRunner } from "./rental-invoice-transaction.runner";

export class CreateRentalInvoiceService {
  constructor(
    private readonly transactionRunner: IRentalInvoiceTransactionRunner,
  ) {}

  async execute(input: CreateRentalInvoiceInput): Promise<RentalInvoiceDto> {
    const data = parseRequest(CreateRentalInvoiceSchema, input);

    return this.transactionRunner.run(
      async ({
        rentalInvoiceRepository,
        rentalOrderInvoiceLookup,
        customerRepository,
        auditLogger,
        userId,
      }) => {
        if (userId === undefined) {
          throw new UnauthorizedError({
            message: "User context is required to create rental invoice",
          });
        }

        const createData = toCreateRentalInvoiceData(data, toUserId(userId));

        try {
          RentalInvoice.create(createData);
        } catch (error) {
          if (error instanceof RentalInvoiceInvariantError) {
            throw new UnprocessableError({
              message: error.message,
              details: { field: error.field },
            });
          }

          throw error;
        }

        const rentalOrder = await rentalOrderInvoiceLookup.findById(
          toRentalOrderId(data.rentalOrderId),
        );

        if (rentalOrder === null) {
          throw new NotFoundError({
            message: "Rental order not found",
            details: { rentalOrderId: data.rentalOrderId },
          });
        }

        validateRentalOrderForInvoice(rentalOrder, data.customerId);

        const customer = await customerRepository.findById(
          toCustomerId(data.customerId),
        );

        validateCustomerForInvoice(customer);

        const existing = await rentalInvoiceRepository.findByInvoiceNumber(
          createData.invoiceNumber,
        );

        if (existing !== null) {
          throw new ConflictError({
            message: "Invoice number already exists",
            details: { invoiceNumber: createData.invoiceNumber },
          });
        }

        const invoice = await rentalInvoiceRepository.create(createData);

        await auditLogger.log({
          module: RENTAL_INVOICE_MODULE,
          entityName: RENTAL_INVOICE_ENTITY_NAME,
          recordId: invoice.id,
          action: "CREATE",
          status: "SUCCESS",
          newValues: toRentalInvoiceAuditValues(invoice),
        });

        return toRentalInvoiceDto(invoice);
      },
    );
  }
}
