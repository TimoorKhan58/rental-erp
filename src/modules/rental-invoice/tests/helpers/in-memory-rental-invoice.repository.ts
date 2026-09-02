import { RentalInvoice } from "@/modules/rental-invoice/domain/rental-invoice.entity";
import { parseInvoiceNumberSequence } from "@/modules/rental-invoice/domain/rental-invoice-number.rules";
import type { RentalInvoiceListQuery } from "@/modules/rental-invoice/domain/rental-invoice-list.query";
import { acquirePaymentCommitmentLock } from "@/modules/payment/infrastructure/payment-commitment-lock";
import type { IRentalInvoiceRepository } from "@/modules/rental-invoice/domain/rental-invoice.repository.interface";
import type {
  CreateRentalInvoiceData,
  UpdateRentalInvoiceData,
  UpdateRentalInvoiceStatusData,
} from "@/modules/rental-invoice/domain/rental-invoice.types";
import type { RentalInvoiceId, RentalOrderId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import { ConflictError } from "@/shared/infrastructure/errors";

import { buildRentalInvoiceEntity } from "./rental-invoice.fixtures";

interface StoredRentalInvoice {
  record: ReturnType<RentalInvoice["toProps"]>;
}

export class InMemoryRentalInvoiceRepository implements IRentalInvoiceRepository {
  private readonly store = new Map<string, StoredRentalInvoice>();
  private readonly invoiceNumbers = new Set<string>();

  private rebuildInvoiceNumberIndex(): void {
    this.invoiceNumbers.clear();

    for (const stored of this.store.values()) {
      this.invoiceNumbers.add(stored.record.invoiceNumber);
    }
  }

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
    this.rebuildInvoiceNumberIndex();
  }

  seed(invoices: RentalInvoice[]): void {
    this.store.clear();
    for (const invoice of invoices) {
      const props = invoice.toProps();
      this.store.set(props.id, { record: props });
    }
    this.rebuildInvoiceNumberIndex();
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

  findActiveByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<RentalInvoice | null> {
    const active = Array.from(this.store.values())
      .map((stored) => RentalInvoice.reconstitute(stored.record))
      .filter(
        (invoice) =>
          invoice.rentalOrderId === rentalOrderId && invoice.status !== "VOID",
      )
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

    return Promise.resolve(active[0] ?? null);
  }

  async findMaxSequenceForInvoicePrefix(prefix: string): Promise<number> {
    let max = 0;

    for (const stored of this.store.values()) {
      const sequence = parseInvoiceNumberSequence(
        stored.record.invoiceNumber,
        prefix,
      );

      if (sequence !== null) {
        max = Math.max(max, sequence);
      }
    }

    return max;
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

    if (query.paymentStatus !== undefined) {
      items = items.filter((item) =>
        matchesPaymentStatus(item, query.paymentStatus!),
      );
    }

    if (query.invoiceDateFrom !== undefined) {
      const from = query.invoiceDateFrom.getTime();
      items = items.filter((item) => item.invoiceDate.getTime() >= from);
    }

    if (query.invoiceDateTo !== undefined) {
      const end = new Date(query.invoiceDateTo);
      end.setHours(23, 59, 59, 999);
      items = items.filter((item) => item.invoiceDate.getTime() <= end.getTime());
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

    if (this.invoiceNumbers.has(normalized.invoiceNumber)) {
      throw new ConflictError({
        message: "Invoice number already exists",
        details: { invoiceNumber: normalized.invoiceNumber },
      });
    }

    this.invoiceNumbers.add(normalized.invoiceNumber);

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

  async claimStatusTransition(
    id: RentalInvoiceId,
    expected: RentalInvoice["status"] | ReadonlyArray<RentalInvoice["status"]>,
    data: UpdateRentalInvoiceStatusData,
  ): Promise<RentalInvoice | null> {
    const existing = this.store.get(id);

    if (!existing) {
      return null;
    }

    const expectedList = Array.isArray(expected) ? expected : [expected];
    if (!expectedList.includes(existing.record.status)) {
      return null;
    }

    return this.updateStatus(id, data);
  }

  async applyPaymentDelta(
    id: RentalInvoiceId,
    delta: number,
  ): Promise<RentalInvoice | null> {
    const existing = this.store.get(id);

    if (!existing || delta === 0) {
      return null;
    }

    const invoice = RentalInvoice.reconstitute(existing.record);

    if (delta > 0) {
      if (
        invoice.status !== "ISSUED" &&
        invoice.status !== "PARTIALLY_PAID" &&
        invoice.status !== "PAID"
      ) {
        return null;
      }

      const nextPaid = roundMoney(invoice.paidAmount + delta);
      if (nextPaid > invoice.grandTotal) {
        return null;
      }
    } else {
      if (invoice.status === "DRAFT" || invoice.status === "VOID") {
        return null;
      }

      const absDelta = -delta;
      if (absDelta <= 0 || invoice.paidAmount < absDelta) {
        return null;
      }
    }

    const nextPaid = roundMoney(invoice.paidAmount + delta);
    const nextBalance = roundMoney(invoice.grandTotal - nextPaid);
    const updated = RentalInvoice.reconstitute({
      ...existing.record,
      paidAmount: nextPaid,
      balance: nextBalance,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async lockForPaymentCommitment(id: RentalInvoiceId): Promise<void> {
    if (!this.store.has(id)) {
      throw new Error("Rental invoice not found");
    }

    await acquirePaymentCommitmentLock(id);
  }

  count(): number {
    return this.store.size;
  }
}

function matchesPaymentStatus(
  invoice: RentalInvoice,
  filter: NonNullable<RentalInvoiceListQuery["paymentStatus"]>,
): boolean {
  if (filter === "void") {
    return invoice.status === "VOID";
  }

  if (filter === "paid") {
    return invoice.status === "PAID" || (invoice.status !== "VOID" && invoice.balance <= 0);
  }

  if (filter === "partial") {
    return (
      invoice.status === "PARTIALLY_PAID" ||
      (invoice.paidAmount > 0 && invoice.balance > 0 && invoice.status !== "VOID")
    );
  }

  return invoice.status === "ISSUED" || (invoice.status === "DRAFT" && invoice.paidAmount === 0);
}

export function createSeededRentalInvoiceRepository(
  invoices: RentalInvoice[] = [buildRentalInvoiceEntity()],
): InMemoryRentalInvoiceRepository {
  const repository = new InMemoryRentalInvoiceRepository();
  repository.seed(invoices);
  return repository;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
