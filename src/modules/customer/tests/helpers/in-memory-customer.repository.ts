import { Customer } from "@/modules/customer/domain/customer.entity";
import type { CustomerListQuery } from "@/modules/customer/domain/customer-list.query";
import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import type {
  CreateCustomerData,
  UpdateCustomerData,
} from "@/modules/customer/domain/customer.types";
import type { CustomerId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildCustomerEntity } from "./customer.fixtures";

interface StoredCustomer {
  record: ReturnType<Customer["toProps"]>;
}

export class InMemoryCustomerRepository implements ICustomerRepository {
  private readonly store = new Map<string, StoredCustomer>();

  snapshot(): Map<string, StoredCustomer> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredCustomer>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(customers: Customer[]): void {
    this.store.clear();
    for (const customer of customers) {
      const props = customer.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: CustomerId): Promise<Customer | null> {
    const stored = this.store.get(id);
    return Promise.resolve(stored ? Customer.reconstitute(stored.record) : null);
  }

  findByPhone(phone: string): Promise<Customer | null> {
    for (const stored of this.store.values()) {
      if (stored.record.phone === phone) {
        return Promise.resolve(Customer.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  findByCustomerCode(customerCode: string): Promise<Customer | null> {
    for (const stored of this.store.values()) {
      if (stored.record.customerCode === customerCode) {
        return Promise.resolve(Customer.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: CustomerListQuery): Promise<PaginatedResult<Customer>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Customer.reconstitute(stored.record),
    );

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.isActive === query.isActive);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.phone.includes(term) ||
          item.customerCode.toLowerCase().includes(term),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof Customer] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof Customer] ?? "",
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

  async exists(id: CustomerId): Promise<boolean> {
    return this.store.has(id);
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    const normalized = Customer.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as CustomerId;

    const customer = Customer.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: customer.toProps() });
    return customer;
  }

  async update(id: CustomerId, data: UpdateCustomerData): Promise<Customer> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Customer not found");
    }

    const updated = Customer.reconstitute({
      ...existing.record,
      name: data.name ?? existing.record.name,
      phone: data.phone ?? existing.record.phone,
      cnic: data.cnic !== undefined ? data.cnic : existing.record.cnic,
      address: data.address ?? existing.record.address,
      notes: data.notes !== undefined ? data.notes : existing.record.notes,
      isActive: data.isActive ?? existing.record.isActive,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async delete(id: CustomerId): Promise<void> {
    this.store.delete(id);
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededRepository(customers: Customer[] = [buildCustomerEntity()]): InMemoryCustomerRepository {
  const repository = new InMemoryCustomerRepository();
  repository.seed(customers);
  return repository;
}
