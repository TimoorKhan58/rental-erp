import { ExternalRentalAgreement } from "@/modules/external-rental/domain";
import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
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
