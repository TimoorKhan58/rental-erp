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
  ExternalRentalAgreementProps,
  UpdateExternalRentalWorkflowData,
} from "@/modules/external-rental/domain";
import type {
  ExternalRentalAgreementId,
  RentalOrderId,
} from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { ConcurrentUpdateError } from "@/shared/infrastructure/errors";

import {
  AGREEMENT_ID,
  AGREEMENT_ITEM_ID,
  buildCreateExternalRentalAgreementData,
} from "./external-rental.fixtures";

type StoreEntry = { record: ExternalRentalAgreementProps };

export class InMemoryExternalRentalRepository
  implements IExternalRentalRepository
{
  private readonly store = new Map<string, StoreEntry>();

  seed(agreements: ExternalRentalAgreement[]): void {
    for (const agreement of agreements) {
      this.store.set(agreement.id, { record: agreement.toProps() });
    }
  }

  snapshot(): Map<string, StoreEntry> {
    return new Map(
      [...this.store.entries()].map(([id, entry]) => [
        id,
        { record: structuredClone(entry.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoreEntry>): void {
    this.store.clear();
    for (const [id, entry] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(entry.record) });
    }
  }

  async findById(
    id: ExternalRentalAgreementId,
  ): Promise<ExternalRentalAgreement | null> {
    const entry = this.store.get(id);
    return entry ? ExternalRentalAgreement.reconstitute(entry.record) : null;
  }

  async findByAgreementNumber(
    agreementNumber: string,
  ): Promise<ExternalRentalAgreement | null> {
    for (const entry of this.store.values()) {
      if (entry.record.agreementNumber === agreementNumber) {
        return ExternalRentalAgreement.reconstitute(entry.record);
      }
    }
    return null;
  }

  async findActiveByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<ExternalRentalAgreement | null> {
    for (const entry of this.store.values()) {
      if (
        entry.record.rentalOrderId === rentalOrderId &&
        entry.record.status !== "CANCELLED"
      ) {
        return ExternalRentalAgreement.reconstitute(entry.record);
      }
    }
    return null;
  }

  async findPaged(
    query: ExternalRentalListQuery,
  ): Promise<PaginatedResult<ExternalRentalAgreement>> {
    let items = Array.from(this.store.values()).map((entry) =>
      ExternalRentalAgreement.reconstitute(entry.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.settlementStatus !== undefined) {
      items = items.filter(
        (item) => item.settlementStatus === query.settlementStatus,
      );
    }

    if (query.supplierId !== undefined) {
      items = items.filter((item) => item.supplierId === query.supplierId);
    }

    if (query.warehouseId !== undefined) {
      items = items.filter((item) => item.warehouseId === query.warehouseId);
    }

    if (query.rentalOrderId !== undefined) {
      items = items.filter(
        (item) => item.rentalOrderId === query.rentalOrderId,
      );
    }

    if (query.hireStartFrom !== undefined) {
      const from = query.hireStartFrom;
      items = items.filter((item) => item.hireStartDate >= from);
    }

    if (query.hireStartTo !== undefined) {
      const to = query.hireStartTo;
      items = items.filter((item) => item.hireStartDate <= to);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.agreementNumber.toLowerCase().includes(term) ||
          (item.remarks?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof ExternalRentalAgreement] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof ExternalRentalAgreement] ?? "",
        ).toLowerCase();

        return leftValue.localeCompare(rightValue) * direction;
      });
    }

    const total = items.length;
    const start = (query.page - 1) * query.pageSize;
    const pagedItems = items.slice(start, start + query.pageSize);

    return {
      items: pagedItems,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
      },
    };
  }

  async create(
    data: CreateExternalRentalAgreementData,
  ): Promise<ExternalRentalAgreement> {
    const created = ExternalRentalAgreement.create(data);
    const id = crypto.randomUUID() as ExternalRentalAgreementId;
    const agreement = ExternalRentalAgreement.reconstitute({
      id,
      status: "DRAFT",
      settlementStatus: "UNSETTLED",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...created,
      items: created.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      })),
    });
    this.store.set(agreement.id, { record: agreement.toProps() });
    return agreement;
  }

  async updateWorkflow(
    id: ExternalRentalAgreementId,
    data: UpdateExternalRentalWorkflowData,
  ): Promise<ExternalRentalAgreement> {
    const existing = this.store.get(id);
    if (!existing) {
      throw new Error("External rental agreement not found");
    }

    const itemMap = new Map(
      data.items.map((item) => [item.id, item] as const),
    );

    const updated = ExternalRentalAgreement.reconstitute({
      ...existing.record,
      status: data.status,
      settlementStatus: data.settlementStatus,
      totalHireInCost: data.totalHireInCost,
      amountDue: data.amountDue,
      amountPaid: data.amountPaid,
      items: existing.record.items.map((item) => {
        const patch = itemMap.get(String(item.id));
        if (!patch) {
          return item;
        }
        return {
          ...item,
          quantityConfirmed: patch.quantityConfirmed,
          quantityReceived: patch.quantityReceived,
          quantityAllocated: patch.quantityAllocated,
          quantityDispatched: patch.quantityDispatched,
          quantityReturnedFromCustomer: patch.quantityReturnedFromCustomer,
          quantityReturnedToSupplier: patch.quantityReturnedToSupplier,
          quantityWrittenOff: patch.quantityWrittenOff,
          lineHireInCost: patch.lineHireInCost,
        };
      }),
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Phase 29 (F-02): mirror of production atomic status claim; used by
   * Confirm and Cancel paths + Cascade Cancel.
   */
  async claimStatusTransition(
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
    const existing = this.store.get(id);
    if (!existing) {
      return null;
    }

    const expectedList = Array.isArray(expected) ? expected : [expected];
    if (!expectedList.includes(existing.record.status)) {
      return null;
    }

    const updated = ExternalRentalAgreement.reconstitute({
      ...existing.record,
      status: next.status,
      settlementStatus:
        next.settlementStatus ?? existing.record.settlementStatus,
      amountDue:
        next.amountDueAbsolute !== undefined
          ? next.amountDueAbsolute
          : existing.record.amountDue,
      amountPaid:
        next.amountPaidAbsolute !== undefined
          ? next.amountPaidAbsolute
          : existing.record.amountPaid,
      totalHireInCost:
        next.totalHireInCostAbsolute !== undefined
          ? next.totalHireInCostAbsolute
          : existing.record.totalHireInCost,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Phase 29 (F-02): mirror of production predicated per-item delta
   * application + status claim. Enforces the same domain invariants the
   * DB predicate enforces (received <= confirmed, allocated <= received,
   * dispatched <= allocated, customer-return <= dispatched, supplier-
   * return / write-off within remaining supplier-side capacity).
   */
  async applyWorkflowDelta(
    id: ExternalRentalAgreementId,
    data: ApplyExternalRentalWorkflowDeltaData,
  ): Promise<ExternalRentalAgreement | null> {
    const existing = this.store.get(id);
    if (!existing) {
      return null;
    }

    if (!data.expectedStatuses.includes(existing.record.status)) {
      return null;
    }

    const itemMap = new Map(
      existing.record.items.map((item) => [String(item.id), { ...item }]),
    );

    for (const delta of data.items) {
      const item = itemMap.get(delta.itemId);
      if (!item) {
        continue;
      }

      switch (data.workflowKind) {
        case "confirm": {
          if (delta.quantityConfirmedAbsolute !== undefined) {
            item.quantityConfirmed = delta.quantityConfirmedAbsolute;
          }
          if (
            delta.lineHireInCostDelta !== undefined &&
            delta.lineHireInCostDelta !== 0
          ) {
            item.lineHireInCost += delta.lineHireInCostDelta;
          }
          break;
        }
        case "receive": {
          const qty = delta.quantityReceivedDelta ?? 0;
          if (qty === 0) break;
          if (item.quantityReceived + qty > item.quantityConfirmed) {
            throw new ConcurrentUpdateError({
              entity: "ExternalRentalAgreementItem",
              id: delta.itemId,
              action: "receive",
            });
          }
          item.quantityReceived += qty;
          if (
            delta.lineHireInCostDelta !== undefined &&
            delta.lineHireInCostDelta !== 0
          ) {
            item.lineHireInCost += delta.lineHireInCostDelta;
          }
          break;
        }
        case "allocate": {
          const qty = delta.quantityAllocatedDelta ?? 0;
          if (qty === 0) break;
          if (item.quantityAllocated + qty > item.quantityReceived) {
            throw new ConcurrentUpdateError({
              entity: "ExternalRentalAgreementItem",
              id: delta.itemId,
              action: "allocate",
            });
          }
          item.quantityAllocated += qty;
          break;
        }
        case "dispatch": {
          const qty = delta.quantityDispatchedDelta ?? 0;
          if (qty === 0) break;
          if (item.quantityDispatched + qty > item.quantityAllocated) {
            throw new ConcurrentUpdateError({
              entity: "ExternalRentalAgreementItem",
              id: delta.itemId,
              action: "dispatch",
            });
          }
          item.quantityDispatched += qty;
          break;
        }
        case "customer-return": {
          const qty = delta.quantityReturnedFromCustomerDelta ?? 0;
          if (qty === 0) break;
          if (
            item.quantityReturnedFromCustomer + qty >
            item.quantityDispatched
          ) {
            throw new ConcurrentUpdateError({
              entity: "ExternalRentalAgreementItem",
              id: delta.itemId,
              action: "customer-return",
            });
          }
          item.quantityReturnedFromCustomer += qty;
          break;
        }
        case "supplier-return": {
          const qty = delta.quantityReturnedToSupplierDelta ?? 0;
          if (qty === 0) break;
          const cap =
            item.quantityReceived -
            item.quantityWrittenOff -
            Math.max(
              item.quantityDispatched - item.quantityReturnedFromCustomer,
              0,
            );
          if (item.quantityReturnedToSupplier + qty > cap) {
            throw new ConcurrentUpdateError({
              entity: "ExternalRentalAgreementItem",
              id: delta.itemId,
              action: "supplier-return",
            });
          }
          item.quantityReturnedToSupplier += qty;
          break;
        }
        case "write-off": {
          const qty = delta.quantityWrittenOffDelta ?? 0;
          if (qty === 0) break;
          const cap =
            item.quantityReceived -
            item.quantityReturnedToSupplier -
            Math.max(
              item.quantityDispatched - item.quantityReturnedFromCustomer,
              0,
            );
          if (item.quantityWrittenOff + qty > cap) {
            throw new ConcurrentUpdateError({
              entity: "ExternalRentalAgreementItem",
              id: delta.itemId,
              action: "write-off",
            });
          }
          item.quantityWrittenOff += qty;
          break;
        }
      }

      itemMap.set(delta.itemId, item);
    }

    const nextItems = existing.record.items.map(
      (item) => itemMap.get(String(item.id)) ?? item,
    );

    let totalHireInCost = existing.record.totalHireInCost;
    let amountDue = existing.record.amountDue;
    let settlementStatus = existing.record.settlementStatus;

    if (data.moneyOverride !== undefined) {
      totalHireInCost = data.moneyOverride.totalHireInCost;
      amountDue = data.moneyOverride.amountDue;
      settlementStatus = data.moneyOverride.settlementStatus;
    } else if (data.recomputeMoney) {
      totalHireInCost = nextItems.reduce(
        (sum, item) => sum + item.lineHireInCost,
        0,
      );
      amountDue = totalHireInCost;
      settlementStatus = deriveSettlementStatus(
        amountDue,
        existing.record.amountPaid,
      );
    }

    const updated = ExternalRentalAgreement.reconstitute({
      ...existing.record,
      status: data.nextStatus,
      settlementStatus,
      totalHireInCost,
      amountDue,
      items: nextItems,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  /**
   * Phase 29 (F-02, decision §12.3): mirror of production predicated
   * settlement — atomically applies `amountPaid + delta <= amountDue`.
   */
  async applySettlement(
    id: ExternalRentalAgreementId,
    paymentAmount: number,
  ): Promise<ExternalRentalAgreement | null> {
    const existing = this.store.get(id);
    if (!existing) {
      return null;
    }
    if (
      existing.record.status === "DRAFT" ||
      existing.record.status === "CANCELLED"
    ) {
      return null;
    }
    if (existing.record.amountDue <= 0) {
      return null;
    }
    if (existing.record.amountPaid + paymentAmount > existing.record.amountDue) {
      return null;
    }

    const nextPaid = existing.record.amountPaid + paymentAmount;
    const nextSettlement = deriveSettlementStatus(
      existing.record.amountDue,
      nextPaid,
    );

    const updated = ExternalRentalAgreement.reconstitute({
      ...existing.record,
      amountPaid: nextPaid,
      settlementStatus: nextSettlement,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }
}

export function createSeededExternalRentalRepository(
  agreements: ExternalRentalAgreement[] = [
    ExternalRentalAgreement.reconstitute({
      ...ExternalRentalAgreement.create(buildCreateExternalRentalAgreementData()),
      id: AGREEMENT_ID,
      status: "DRAFT",
      settlementStatus: "UNSETTLED",
      createdAt: new Date("2026-08-01T00:00:00.000Z"),
      updatedAt: new Date("2026-08-01T00:00:00.000Z"),
      items: ExternalRentalAgreement.create(
        buildCreateExternalRentalAgreementData(),
      ).items.map((item) => ({ ...item, id: AGREEMENT_ITEM_ID })),
    }),
  ],
): InMemoryExternalRentalRepository {
  const repository = new InMemoryExternalRentalRepository();
  repository.seed(agreements);
  return repository;
}
