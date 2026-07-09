import { Account } from "@/modules/accounting/domain/account.entity";
import type { AccountListQuery } from "@/modules/accounting/domain/account-list.query";
import type { IAccountRepository } from "@/modules/accounting/domain/account.repository.interface";
import type {
  CreateAccountData,
  UpdateAccountData,
} from "@/modules/accounting/domain/account.types";
import type { AccountId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import { buildAccountEntity } from "./account.fixtures";

interface StoredAccount {
  record: ReturnType<Account["toProps"]>;
}

export class InMemoryAccountRepository implements IAccountRepository {
  private readonly store = new Map<string, StoredAccount>();

  snapshot(): Map<string, StoredAccount> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredAccount>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(accounts: Account[]): void {
    this.store.clear();
    for (const account of accounts) {
      const props = account.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: AccountId): Promise<Account | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Account.reconstitute(stored.record) : null,
    );
  }

  findByAccountCode(accountCode: string): Promise<Account | null> {
    for (const stored of this.store.values()) {
      if (stored.record.accountCode === accountCode) {
        return Promise.resolve(Account.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: AccountListQuery): Promise<PaginatedResult<Account>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Account.reconstitute(stored.record),
    );

    if (query.accountType !== undefined) {
      items = items.filter((item) => item.accountType === query.accountType);
    }

    if (query.isActive !== undefined) {
      items = items.filter((item) => item.isActive === query.isActive);
    }

    if (query.search) {
      const term = query.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.accountCode.toLowerCase().includes(term) ||
          item.name.toLowerCase().includes(term) ||
          (item.description?.toLowerCase().includes(term) ?? false),
      );
    }

    if (query.sortBy) {
      const direction = query.sortOrder === "desc" ? -1 : 1;
      items.sort((left, right) => {
        const leftValue = String(
          left[query.sortBy as keyof Account] ?? "",
        ).toLowerCase();
        const rightValue = String(
          right[query.sortBy as keyof Account] ?? "",
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

  async create(data: CreateAccountData): Promise<Account> {
    const normalized = Account.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as AccountId;

    const account = Account.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: account.toProps() });
    return account;
  }

  async update(id: AccountId, data: UpdateAccountData): Promise<Account> {
    const existing = this.store.get(id);

    if (!existing) {
      throw new Error("Account not found");
    }

    const entity = Account.reconstitute(existing.record);
    const updated = entity.withUpdated(data);
    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  count(): number {
    return this.store.size;
  }
}

export function createSeededAccountRepository(
  accounts: Account[] = [buildAccountEntity()],
): InMemoryAccountRepository {
  const repository = new InMemoryAccountRepository();
  repository.seed(accounts);
  return repository;
}
