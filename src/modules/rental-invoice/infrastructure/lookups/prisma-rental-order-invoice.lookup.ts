import type { Prisma } from "@/generated/prisma/client";
import type {
  IRentalOrderInvoiceLookup,
  RentalOrderInvoiceLookupResult,
} from "@/modules/rental-invoice/domain/rental-order-invoice.lookup.interface";
import type { RentalOrderId } from "@/shared/domain/ids";
import type { CustomerId } from "@/shared/domain/ids";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";
import { repositoryFindFirst } from "@/shared/infrastructure/database";
import { createObservableRepositoryRunnerFromSharedDeps } from "@/shared/infrastructure/database";

const MODEL = "RentalOrder";

export class PrismaRentalOrderInvoiceLookup implements IRentalOrderInvoiceLookup {
  constructor(
    private readonly deps: Pick<SharedDeps, "prisma" | "logger">,
    private readonly tx?: Prisma.TransactionClient,
  ) {}

  findById(id: RentalOrderId): Promise<RentalOrderInvoiceLookupResult | null> {
    const runner = createObservableRepositoryRunnerFromSharedDeps(this.deps, {
      tx: this.tx,
      repositoryName: "RentalOrderInvoiceLookup",
    });

    return repositoryFindFirst(
      runner,
      (db) =>
        db.rentalOrder.findUnique({
          where: { id },
          select: {
            id: true,
            customerId: true,
            status: true,
          },
        }),
      { model: MODEL, operation: "findByIdForInvoice" },
    ).then((record) =>
      record
        ? {
            id: record.id as RentalOrderId,
            customerId: record.customerId as CustomerId,
            status: record.status,
          }
        : null,
    );
  }
}

export function createRentalOrderInvoiceLookupFromSharedDeps(
  deps: SharedDeps,
  tx?: Prisma.TransactionClient,
): IRentalOrderInvoiceLookup {
  return new PrismaRentalOrderInvoiceLookup(deps, tx);
}

export function createRentalOrderInvoiceLookupFromUnitOfWork(
  context: import("@/shared/infrastructure/database").RepositoryUnitOfWorkContext,
): IRentalOrderInvoiceLookup {
  return new PrismaRentalOrderInvoiceLookup(context.deps, context.tx);
}
