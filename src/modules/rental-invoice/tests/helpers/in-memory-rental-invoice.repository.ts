import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import type { RentalInvoiceListQuery } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import type {
  CreateRentalInvoiceData,
  UpdateRentalInvoiceData,
  UpdateRentalInvoiceStatusData,
} from "@/modules/rental-invoice/domain/rental-invoice.types";
import type { RentalInvoiceId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildRentalInvoiceEntity } from "./rental-invoice.fixtures";

interface StoredRentalInvoice {
  record: ReturnType<RentalInvoice["toProps"]>;
}

export class InMemoryRentalInvoiceRepository implements IRentalInvoiceRepository {
  private readonly store = new Map<string, StoredRentalInvoice>();

  snapshot(): Map<string, StoredRentalInvoice> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredRentalInvoice>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(invoices: RentalInvoice[]): void {
    this.store.clear();
    for (const invoice of invoices) {
      const props = invoice.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: RentalInvoiceId): Promise<RentalInvoice | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? RentalInvoice.reconstitute(stored.record) : null,
    );
  }

  findByInvoiceNumber(invoiceNumber: string): Promise<RentalInvoice | null> {
    for (const stored of this.store.values()) {
      if (stored.record.invoiceNumber === invoiceNumber) {
        return Promise.resolve(RentalInvoice.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: RentalInvoiceListQuery,
  ): Promise<PaginatedResult<RentalInvoice>> {
    let items = Array.from(this.store.values()).map((stored) =>
      RentalInvoice.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.customerId !== undefined) {
      items = items.filter((item) => item.customerId === query.customerId);
    }

    if (query.rentalOrderId !== undefined) {
      items = items.filter((item) => item.rentalOrderId === query.rentalOrderId);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.invoiceNumber.toLowerCase().includes(term) ||
          (item.notes?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        let leftValue: string;
        let rightValue: string;

        if (query.sortBy === "invoiceDate") {
          leftValue = String(left.invoiceDate.getTime());
          rightValue = String(right.invoiceDate.getTime());
        } else if (query.sortBy === "dueDate") {
          leftValue = String(left.dueDate?.getTime() ?? "");
          rightValue = String(right.dueDate?.getTime() ?? "");
        } else if (query.sortBy === "createdAt") {
          leftValue = String(left.createdAt.getTime());
          rightValue = String(right.createdAt.getTime());
        } else if (query.sortBy === "grandTotal") {
          leftValue = String(left.grandTotal);
          rightValue = String(right.grandTotal);
        } else {
          leftValue = String(
            left[query.sortBy as keyof RentalInvoice] ?? "",
          ).toLowerCase();
          rightValue = String(
            right[query.sortBy as keyof RentalInvoice] ?? "",
          ).toLowerCase();
        }

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

  async create(data: CreateRentalInvoiceData): Promise<RentalInvoice> {
    const normalized = RentalInvoice.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as RentalInvoiceId;
    const items = normalized.items.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
    }));

    const invoice = RentalInvoice.reconstitute({
      id,
      ...normalized,
      items,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: invoice.toProps() });
    return invoice;
  }

  async update(
    id: RentalInvoiceId,
    data: UpdateRentalInvoiceData,
  ): Promise<RentalInvoice> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Rental invoice not found");
    }

    const entity = RentalInvoice.reconstitute(existing.record);
    const updated = entity.withUpdated(data);
    const updatedProps = updated.toProps();

    if (data.items !== undefined) {
      updatedProps.items = updatedProps.items.map((item) => ({
        ...item,
        id: crypto.randomUUID(),
      }));
    }

    this.store.set(id, { record: updatedProps });
    return RentalInvoice.reconstitute(updatedProps);
  }

  async updateStatus(
    id: RentalInvoiceId,
    data: UpdateRentalInvoiceStatusData,
  ): Promise<RentalInvoice> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Rental invoice not found");
    }

    const updated = RentalInvoice.reconstitute({
      ...existing.record,
      status: data.status,
      issuedAt:
        data.issuedAt !== undefined ? data.issuedAt : existing.record.issuedAt,
      voidedAt:
        data.voidedAt !== undefined ? data.voidedAt : existing.record.voidedAt,
      paidAmount:
        data.paidAmount !== undefined
          ? data.paidAmount
          : existing.record.paidAmount,
      balance:
        data.balance !== undefined ? data.balance : existing.record.balance,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededRentalInvoiceRepository(
  invoices: RentalInvoice[] = [buildRentalInvoiceEntity()],
): InMemoryRentalInvoiceRepository {
  const repository = new InMemoryRentalInvoiceRepository();
  repository.seed(invoices);
  return repository;
}
