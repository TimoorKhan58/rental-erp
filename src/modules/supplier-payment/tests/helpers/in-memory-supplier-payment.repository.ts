import { SupplierPayment } from "@/modules/supplier-payment/domain/supplier-payment.entity";
import type { SupplierPaymentListQuery } from "@/modules/supplier-payment/domain/supplier-payment-list.query";
import type { ISupplierPaymentRepository } from "@/modules/supplier-payment/domain/supplier-payment.repository.interface";
import type {
  CreateSupplierPaymentData,
  UpdateSupplierPaymentStatusData,
} from "@/modules/supplier-payment/domain/supplier-payment.types";
import type { SupplierPaymentId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildSupplierPaymentEntity } from "./supplier-payment.fixtures";

interface StoredSupplierPayment {
  record: ReturnType<SupplierPayment["toProps"]>;
}

export class InMemorySupplierPaymentRepository
  implements ISupplierPaymentRepository
{
  private readonly store = new Map<string, StoredSupplierPayment>();

  snapshot(): Map<string, StoredSupplierPayment> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredSupplierPayment>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(payments: SupplierPayment[]): void {
    this.store.clear();
    for (const payment of payments) {
      const props = payment.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: SupplierPaymentId): Promise<SupplierPayment | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? SupplierPayment.reconstitute(stored.record) : null,
    );
  }

  findByPaymentNumber(
    paymentNumber: string,
  ): Promise<SupplierPayment | null> {
    for (const stored of this.store.values()) {
      if (stored.record.paymentNumber === paymentNumber) {
        return Promise.resolve(SupplierPayment.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(
    query: SupplierPaymentListQuery,
  ): Promise<PaginatedResult<SupplierPayment>> {
    let items = Array.from(this.store.values()).map((stored) =>
      SupplierPayment.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.supplierId !== undefined) {
      items = items.filter((item) => item.supplierId === query.supplierId);
    }

    if (query.purchaseOrderId !== undefined) {
      items = items.filter(
        (item) => item.purchaseOrderId === query.purchaseOrderId,
      );
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.paymentNumber.toLowerCase().includes(term) ||
          (item.referenceNumber?.toLowerCase().includes(term) ?? false) ||
          (item.notes?.toLowerCase().includes(term) ?? false),
      );
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

  async create(data: CreateSupplierPaymentData): Promise<SupplierPayment> {
    const normalized = SupplierPayment.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as SupplierPaymentId;

    const payment = SupplierPayment.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: payment.toProps() });
    return payment;
  }

  async updateStatus(
    id: SupplierPaymentId,
    data: UpdateSupplierPaymentStatusData,
  ): Promise<SupplierPayment> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Supplier payment not found");
    }

    const updated = SupplierPayment.reconstitute({
      ...existing.record,
      status: data.status,
      postedAt:
        data.postedAt !== undefined ? data.postedAt : existing.record.postedAt,
      voidedAt:
        data.voidedAt !== undefined ? data.voidedAt : existing.record.voidedAt,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededSupplierPaymentRepository(
  payments: SupplierPayment[] = [buildSupplierPaymentEntity()],
): InMemorySupplierPaymentRepository {
  const repository = new InMemorySupplierPaymentRepository();
  repository.seed(payments);
  return repository;
}
