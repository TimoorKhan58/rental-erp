import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import type { IAuditLogger } from "@/shared/infrastructure/audit/audit-logger.interface";
import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import type { INotificationService } from "@/shared/infrastructure/notifications/notification-service.interface";

export interface PaymentWriteScope {
  readonly paymentRepository: IPaymentRepository;
  readonly rentalInvoiceRepository: IRentalInvoiceRepository;
  readonly auditLogger: IAuditLogger;
  readonly notificationService: INotificationService;
  readonly db: DbClient;
  readonly userId: string | undefined;
}

export interface IPaymentTransactionRunner {
  run<T>(operation: (scope: PaymentWriteScope) => Promise<T>): Promise<T>;
}
