import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import type { IRentalOrderInvoiceLookup } from "@/modules/rental-invoice/domain/rental-order-invoice.lookup.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { INotificationService } from "@/shared/infrastructure/notifications/notification-service.interface";

export interface RentalInvoiceWriteScope {
  readonly rentalInvoiceRepository: IRentalInvoiceRepository;
  readonly rentalOrderInvoiceLookup: IRentalOrderInvoiceLookup;
  readonly customerRepository: ICustomerRepository;
  readonly auditLogger: IAuditLogger;
  readonly notificationService: INotificationService;
  readonly db: DbClient;
  readonly userId: string | undefined;
}

export interface IRentalInvoiceTransactionRunner {
  run<T>(
    operation: (scope: RentalInvoiceWriteScope) => Promise<T>,
  ): Promise<T>;
}
