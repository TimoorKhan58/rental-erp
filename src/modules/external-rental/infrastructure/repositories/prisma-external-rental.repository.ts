import { Prisma } from "@/generated/prisma/client";
import type {
  ExternalRentalAgreementId,
  RentalOrderId,
} from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";
import { ConcurrentUpdateError } from "@/shared/infrastructure/errors";

import {
  ExternalRentalAgreement,
  deriveSettlementStatus,
} from "@/modules/external-rental/domain";
import type {
  ApplyExternalRentalWorkflowDeltaData,
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
  IExternalRentalRepository,
} from "@/modules/external-rental/domain";
import type { ExternalRentalListQuery } from "@/modules/external-rental/domain";
import type {
  CreateExternalRentalAgreementData,
  UpdateExternalRentalWorkflowData,
} from "@/modules/external-rental/domain";
import { EXTERNAL_RENTAL_SEARCH_FIELDS } from "@/modules/external-rental/domain";

import {
  EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
  toExternalRentalAgreementCreateInput,
  toExternalRentalAgreementDomain,
  toExternalRentalWorkflowUpdateInput,
} from "../mappers/external-rental.persistence.mapper";

const MODEL = "ExternalRentalAgreement";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapExternalRentalFilter(
  filter: Record<string, unknown>,
):
  | import("@/generated/prisma/client").Prisma.ExternalRentalAgreementWhereInput
  | undefined {
  const where: import("@/generated/prisma/client").Prisma.ExternalRentalAgreementWhereInput =
    {};

  if (filter.status !== undefined) {
    where.status = filter.status as ExternalRentalAgreement["status"];
  }

  if (filter.settlementStatus !== undefined) {
    where.settlementStatus =
      filter.settlementStatus as ExternalRentalAgreement["settlementStatus"];
  }

  if (filter.supplierId !== undefined) {
    where.supplierId = String(filter.supplierId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
  }

  if (
    filter.hireStartFrom !== undefined ||
    filter.hireStartTo !== undefined
  ) {
    where.hireStartDate = {};

    if (filter.hireStartFrom !== undefined) {
      where.hireStartDate.gte = filter.hireStartFrom as Date;
    }

    if (filter.hireStartTo !== undefined) {
      where.hireStartDate.lte = filter.hireStartTo as Date;
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapExternalRentalSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.ExternalRentalAgreementOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.ExternalRentalAgreementOrderByWithRelationInput;
}

export class PrismaExternalRentalRepository
  implements IExternalRentalRepository
{
  constructor(private readonly runner: RepositoryRunner) {}

  findById(
    id: ExternalRentalAgreementId,
  ): Promise<ExternalRentalAgreement | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.externalRentalAgreement.findUnique({
          where: { id },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) =>
      record ? toExternalRentalAgreementDomain(record) : null,
    );
  }

  findByAgreementNumber(
    agreementNumber: string,
  ): Promise<ExternalRentalAgreement | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.externalRentalAgreement.findUnique({
          where: { agreementNumber },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "findByAgreementNumber" },
    ).then((record) =>
      record ? toExternalRentalAgreementDomain(record) : null,
    );
  }

  findActiveByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<ExternalRentalAgreement | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.externalRentalAgreement.findFirst({
          where: {
            rentalOrderId,
            status: { not: "CANCELLED" },
          },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "findActiveByRentalOrderId" },
    ).then((record) =>
      record ? toExternalRentalAgreementDomain(record) : null,
    );
  }

  findPaged(
    query: ExternalRentalListQuery,
  ): Promise<PaginatedResult<ExternalRentalAgreement>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.settlementStatus !== undefined) {
      filter.settlementStatus = query.settlementStatus;
    }

    if (query.supplierId !== undefined) {
      filter.supplierId = query.supplierId;
    }

    if (query.warehouseId !== undefined) {
      filter.warehouseId = query.warehouseId;
    }

    if (query.rentalOrderId !== undefined) {
      filter.rentalOrderId = query.rentalOrderId;
    }

    if (query.hireStartFrom !== undefined) {
      filter.hireStartFrom = query.hireStartFrom;
    }

    if (query.hireStartTo !== undefined) {
      filter.hireStartTo = query.hireStartTo;
    }

    return runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          search: query.search,
          searchFields: EXTERNAL_RENTAL_SEARCH_FIELDS,
        }),
        searchFields: EXTERNAL_RENTAL_SEARCH_FIELDS,
        mapFilter: mapExternalRentalFilter,
        mapSort: mapExternalRentalSort,
        handlers: {
          findMany: (db, args) =>
            db.externalRentalAgreement.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
            }),
          count: (db, args) =>
            db.externalRentalAgreement.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toExternalRentalAgreementDomain),
      meta: result.meta,
    }));
  }

  create(
    data: CreateExternalRentalAgreementData,
  ): Promise<ExternalRentalAgreement> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.externalRentalAgreement.create({
          data: toExternalRentalAgreementCreateInput(data),
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then((record) => toExternalRentalAgreementDomain(record));
  }

  updateWorkflow(
    id: ExternalRentalAgreementId,
    data: UpdateExternalRentalWorkflowData,
  ): Promise<ExternalRentalAgreement> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.externalRentalAgreement.update({
          where: { id },
          data: toExternalRentalWorkflowUpdateInput(data),
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "updateWorkflow" },
    ).then((record) => toExternalRentalAgreementDomain(record));
  }

  claimStatusTransition(
    id: ExternalRentalAgreementId,
    expected:
      | ExternalRentalAgreementStatus
      | ReadonlyArray<ExternalRentalAgreementStatus>,
    next: {
      status: ExternalRentalAgreementStatus;
      settlementStatus?: ExternalRentalSettlementStatus;
      amountDueAbsolute?: number;
      amountPaidAbsolute?: number;
      totalHireInCostAbsolute?: number;
    },
  ): Promise<ExternalRentalAgreement | null> {
    return this.runner.run(
      async (db) => {
        // Phase 29 (F-02): once-only status claim via updateMany predicate.
        const update: Prisma.ExternalRentalAgreementUpdateManyMutationInput = {
          status: next.status,
        };

        if (next.settlementStatus !== undefined) {
          update.settlementStatus = next.settlementStatus;
        }
        if (next.amountDueAbsolute !== undefined) {
          update.amountDue = new Prisma.Decimal(next.amountDueAbsolute);
        }
        if (next.amountPaidAbsolute !== undefined) {
          update.amountPaid = new Prisma.Decimal(next.amountPaidAbsolute);
        }
        if (next.totalHireInCostAbsolute !== undefined) {
          update.totalHireInCost = new Prisma.Decimal(
            next.totalHireInCostAbsolute,
          );
        }

        const expectedList = Array.isArray(expected)
          ? [...expected]
          : [expected];

        const claimed = await db.externalRentalAgreement.updateMany({
          where: {
            id,
            status: { in: expectedList },
          },
          data: update,
        });

        if (claimed.count !== 1) {
          return null;
        }

        const record = await db.externalRentalAgreement.findUnique({
          where: { id },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        });

        return record === null ? null : toExternalRentalAgreementDomain(record);
      },
      { model: MODEL, operation: "claimStatusTransition" },
    );
  }

  applyWorkflowDelta(
    id: ExternalRentalAgreementId,
    data: ApplyExternalRentalWorkflowDeltaData,
  ): Promise<ExternalRentalAgreement | null> {
    return this.runner.run(
      async (db) => {
        // Phase 29 (F-02): parent status transition via atomic updateMany
        // predicate. Once this succeeds, we hold a row lock on the parent
        // until commit — subsequent workflow claimants block, guaranteeing
        // the item increments and money recompute below are not interleaved
        // by a competing workflow op on the same agreement.
        const claimed = await db.externalRentalAgreement.updateMany({
          where: {
            id,
            status: { in: [...data.expectedStatuses] },
          },
          data: { status: data.nextStatus },
        });

        if (claimed.count !== 1) {
          return null;
        }

        // Phase 29 (F-02): per-item counter increments use predicated raw
        // SQL so the domain invariant (e.g. received <= confirmed) is
        // enforced atomically by the database. If two concurrent workflow
        // ops each satisfied the domain check against stale state but
        // together would breach the invariant, the second UPDATE matches
        // zero rows and we roll back the transaction.
        for (const item of data.items) {
          switch (data.workflowKind) {
            case "confirm": {
              if (item.quantityConfirmedAbsolute === undefined) break;
              const lineHireInCost = new Prisma.Decimal(
                item.lineHireInCostDelta ?? 0,
              );
              await db.externalRentalAgreementItem.update({
                where: { id: item.itemId },
                data: {
                  quantityConfirmed: item.quantityConfirmedAbsolute,
                  ...(item.lineHireInCostDelta !== undefined &&
                  item.lineHireInCostDelta !== 0
                    ? { lineHireInCost: { increment: lineHireInCost } }
                    : {}),
                },
              });
              break;
            }
            case "receive": {
              const delta = item.quantityReceivedDelta ?? 0;
              if (delta === 0) break;
              const hireDelta = new Prisma.Decimal(
                item.lineHireInCostDelta ?? 0,
              );
              // BD-11: received <= confirmed; lineHireInCost recognizes the
              // received units at unitCost.
              const rows = await db.$executeRaw`
                UPDATE "external_rental_agreement_items"
                SET
                  "quantityReceived" = "quantityReceived" + ${delta},
                  "lineHireInCost" = "lineHireInCost" + ${hireDelta}
                WHERE "id" = ${item.itemId}::uuid
                  AND "agreementId" = ${id}::uuid
                  AND "quantityReceived" + ${delta} <= "quantityConfirmed"
              `;
              if (rows === 0) {
                throw new ConcurrentUpdateError({
                  entity: "ExternalRentalAgreementItem",
                  id: item.itemId,
                  action: "receive",
                });
              }
              break;
            }
            case "allocate": {
              const delta = item.quantityAllocatedDelta ?? 0;
              if (delta === 0) break;
              const rows = await db.$executeRaw`
                UPDATE "external_rental_agreement_items"
                SET "quantityAllocated" = "quantityAllocated" + ${delta}
                WHERE "id" = ${item.itemId}::uuid
                  AND "agreementId" = ${id}::uuid
                  AND "quantityAllocated" + ${delta} <= "quantityReceived"
              `;
              if (rows === 0) {
                throw new ConcurrentUpdateError({
                  entity: "ExternalRentalAgreementItem",
                  id: item.itemId,
                  action: "allocate",
                });
              }
              break;
            }
            case "dispatch": {
              const delta = item.quantityDispatchedDelta ?? 0;
              if (delta === 0) break;
              const rows = await db.$executeRaw`
                UPDATE "external_rental_agreement_items"
                SET "quantityDispatched" = "quantityDispatched" + ${delta}
                WHERE "id" = ${item.itemId}::uuid
                  AND "agreementId" = ${id}::uuid
                  AND "quantityDispatched" + ${delta} <= "quantityAllocated"
              `;
              if (rows === 0) {
                throw new ConcurrentUpdateError({
                  entity: "ExternalRentalAgreementItem",
                  id: item.itemId,
                  action: "dispatch",
                });
              }
              break;
            }
            case "customer-return": {
              const delta = item.quantityReturnedFromCustomerDelta ?? 0;
              if (delta === 0) break;
              const rows = await db.$executeRaw`
                UPDATE "external_rental_agreement_items"
                SET "quantityReturnedFromCustomer" = "quantityReturnedFromCustomer" + ${delta}
                WHERE "id" = ${item.itemId}::uuid
                  AND "agreementId" = ${id}::uuid
                  AND "quantityReturnedFromCustomer" + ${delta} <= "quantityDispatched"
              `;
              if (rows === 0) {
                throw new ConcurrentUpdateError({
                  entity: "ExternalRentalAgreementItem",
                  id: item.itemId,
                  action: "customer-return",
                });
              }
              break;
            }
            case "supplier-return": {
              const delta = item.quantityReturnedToSupplierDelta ?? 0;
              if (delta === 0) break;
              // Available supplier-return capacity is what has been received
              // and is NOT currently at the customer and NOT already
              // written off or already returned:
              //   received - writtenOff - returnedToSupplier
              //     - max(dispatched - returnedFromCustomer, 0) >= delta
              const rows = await db.$executeRaw`
                UPDATE "external_rental_agreement_items"
                SET "quantityReturnedToSupplier" = "quantityReturnedToSupplier" + ${delta}
                WHERE "id" = ${item.itemId}::uuid
                  AND "agreementId" = ${id}::uuid
                  AND "quantityReturnedToSupplier" + ${delta}
                      <= "quantityReceived" - "quantityWrittenOff"
                         - GREATEST("quantityDispatched" - "quantityReturnedFromCustomer", 0)
              `;
              if (rows === 0) {
                throw new ConcurrentUpdateError({
                  entity: "ExternalRentalAgreementItem",
                  id: item.itemId,
                  action: "supplier-return",
                });
              }
              break;
            }
            case "write-off": {
              const delta = item.quantityWrittenOffDelta ?? 0;
              if (delta === 0) break;
              const rows = await db.$executeRaw`
                UPDATE "external_rental_agreement_items"
                SET "quantityWrittenOff" = "quantityWrittenOff" + ${delta}
                WHERE "id" = ${item.itemId}::uuid
                  AND "agreementId" = ${id}::uuid
                  AND "quantityWrittenOff" + ${delta}
                      <= "quantityReceived" - "quantityReturnedToSupplier"
                         - GREATEST("quantityDispatched" - "quantityReturnedFromCustomer", 0)
              `;
              if (rows === 0) {
                throw new ConcurrentUpdateError({
                  entity: "ExternalRentalAgreementItem",
                  id: item.itemId,
                  action: "write-off",
                });
              }
              break;
            }
          }
        }

        // Phase 29: Confirm supplies a provisional moneyOverride (based on
        // quantityConfirmed × unitCost) since lineHireInCost is 0 until
        // Receive recognizes hire-in per BD-11.
        if (data.moneyOverride !== undefined) {
          await db.externalRentalAgreement.update({
            where: { id },
            data: {
              totalHireInCost: new Prisma.Decimal(
                data.moneyOverride.totalHireInCost,
              ),
              amountDue: new Prisma.Decimal(data.moneyOverride.amountDue),
              settlementStatus: data.moneyOverride.settlementStatus,
            },
          });
        } else if (data.recomputeMoney) {
          // Phase 29: derived money is recomputed from post-increment item
          // state via SQL SUM inside the same transaction (BD-11:
          // amountDue = totalHireInCost = Σ lineHireInCost). This closes
          // the race where two concurrent receives on different items each
          // wrote a stale absolute total.
          const sums = await db.$queryRaw<
            Array<{ total: Prisma.Decimal | null; amountPaid: Prisma.Decimal }>
          >`
            SELECT
              COALESCE((
                SELECT SUM("lineHireInCost")
                FROM "external_rental_agreement_items"
                WHERE "agreementId" = ${id}::uuid
              ), 0) AS "total",
              "amountPaid"
            FROM "external_rental_agreements"
            WHERE "id" = ${id}::uuid
          `;

          const row = sums[0];
          if (row !== undefined) {
            const totalNumber = (row.total ?? new Prisma.Decimal(0)).toNumber();
            const paidNumber = row.amountPaid.toNumber();
            const settlement = deriveSettlementStatus(totalNumber, paidNumber);

            await db.externalRentalAgreement.update({
              where: { id },
              data: {
                totalHireInCost: new Prisma.Decimal(totalNumber),
                amountDue: new Prisma.Decimal(totalNumber),
                settlementStatus: settlement,
              },
            });
          }
        }

        const record = await db.externalRentalAgreement.findUnique({
          where: { id },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        });

        return record === null ? null : toExternalRentalAgreementDomain(record);
      },
      { model: MODEL, operation: "applyWorkflowDelta" },
    );
  }

  applySettlement(
    id: ExternalRentalAgreementId,
    paymentAmount: number,
  ): Promise<ExternalRentalAgreement | null> {
    return this.runner.run(
      async (db) => {
        // Phase 29 (F-02, decision §10.2 / §12.3): predicated raw SQL
        // enforces `amountPaid + delta <= amountDue` atomically. Two
        // concurrent settlements can both succeed additively provided
        // their sum stays within amountDue; a payment that would breach
        // amountDue yields zero affected rows.
        const rows = await db.$queryRaw<
          Array<{
            amountPaid: Prisma.Decimal;
            amountDue: Prisma.Decimal;
          }>
        >`
          UPDATE "external_rental_agreements"
          SET
            "amountPaid" = "amountPaid" + ${new Prisma.Decimal(paymentAmount)},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${id}::uuid
            AND "status" NOT IN ('DRAFT', 'CANCELLED')
            AND "amountPaid" + ${new Prisma.Decimal(paymentAmount)} <= "amountDue"
            AND "amountDue" > 0
          RETURNING "amountPaid", "amountDue"
        `;

        const row = rows[0];
        if (row === undefined) {
          return null;
        }

        const paidNumber = row.amountPaid.toNumber();
        const dueNumber = row.amountDue.toNumber();
        const settlement = deriveSettlementStatus(dueNumber, paidNumber);

        await db.externalRentalAgreement.update({
          where: { id },
          data: { settlementStatus: settlement },
        });

        const record = await db.externalRentalAgreement.findUnique({
          where: { id },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        });

        return record === null ? null : toExternalRentalAgreementDomain(record);
      },
      { model: MODEL, operation: "applySettlement" },
    );
  }
}
