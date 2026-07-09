import { Payment } from "@/modules/payment/domain/payment.entity";
import type { PaymentListQuery } from "@/modules/payment/domain/payment-list.query";
import type { IPaymentRepository } from "@/modules/payment/domain/payment.repository.interface";
import type {
  CreatePaymentData,
  UpdatePaymentData,
  UpdatePaymentStatusData,
} from "@/modules/payment/domain/payment.types";
import type { PaymentId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildPaymentEntity } from "./payment.fixtures";

interface StoredPayment {
  record: ReturnType<Payment["toProps"]>;
}

export class InMemoryPaymentRepository implements IPaymentRepository {
  private readonly store = new Map<string, StoredPayment>();

  snapshot(): Map<string, StoredPayment> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredPayment>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(payments: Payment[]): void {
    this.store.clear();
    for (const payment of payments) {
      const props = payment.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: PaymentId): Promise<Payment | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Payment.reconstitute(stored.record) : null,
    );
  }

  findByPaymentNumber(paymentNumber: string): Promise<Payment | null> {
    for (const stored of this.store.values()) {
      if (stored.record.paymentNumber === paymentNumber) {
        return Promise.resolve(Payment.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: PaymentListQuery): Promise<PaginatedResult<Payment>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Payment.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    if (query.customerId !== undefined) {
      items = items.filter((item) => item.customerId === query.customerId);
    }

    if (query.rentalInvoiceId !== undefined) {
      items = items.filter(
        (item) => item.rentalInvoiceId === query.rentalInvoiceId,
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

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        let leftValue: string;
        let rightValue: string;

        if (query.sortBy === "paymentDate") {
          leftValue = String(left.paymentDate.getTime());
          rightValue = String(right.paymentDate.getTime());
        } else if (query.sortBy === "createdAt") {
          leftValue = String(left.createdAt.getTime());
          rightValue = String(right.createdAt.getTime());
        } else if (query.sortBy === "amount") {
          leftValue = String(left.amount);
          rightValue = String(right.amount);
        } else {
          leftValue = String(
            left[query.sortBy as keyof Payment] ?? "",
          ).toLowerCase();
          rightValue = String(
            right[query.sortBy as keyof Payment] ?? "",
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

  async create(data: CreatePaymentData): Promise<Payment> {
    const normalized = Payment.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as PaymentId;

    const payment = Payment.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: payment.toProps() });
    return payment;
  }

  async update(id: PaymentId, data: UpdatePaymentData): Promise<Payment> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Payment not found");
    }

    const entity = Payment.reconstitute(existing.record);
    const updated = entity.withUpdated(data);
    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: PaymentId,
    data: UpdatePaymentStatusData,
  ): Promise<Payment> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Payment not found");
    }

    const updated = Payment.reconstitute({
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

export function createSeededPaymentRepository(
  payments: Payment[] = [buildPaymentEntity()],
): InMemoryPaymentRepository {
  const repository = new InMemoryPaymentRepository();
  repository.seed(payments);
  return repository;
}
