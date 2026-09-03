import { Expense } from "@/modules/expense/domain/expense.entity";
import type { ExpenseListQuery } from "@/modules/expense/domain/expense-list.query";
import type { IExpenseRepository } from "@/modules/expense/domain/expense.repository.interface";
import type {
  CreateExpenseData,
  UpdateExpenseData,
  UpdateExpenseStatusData,
} from "@/modules/expense/domain/expense.types";
import type { ExpenseId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

interface StoredExpense {
  record: ReturnType<Expense["toProps"]>;
}

export class InMemoryExpenseRepository implements IExpenseRepository {
  private readonly store = new Map<string, StoredExpense>();

  snapshot(): Map<string, StoredExpense> {
    return new Map(
      Array.from(this.store.entries()).map(([id, value]) => [
        id,
        { record: structuredClone(value.record) },
      ]),
    );
  }

  restore(snapshot: Map<string, StoredExpense>): void {
    this.store.clear();
    for (const [id, value] of snapshot.entries()) {
      this.store.set(id, { record: structuredClone(value.record) });
    }
  }

  seed(expenses: Expense[]): void {
    this.store.clear();
    for (const expense of expenses) {
      const props = expense.toProps();
      this.store.set(props.id, { record: props });
    }
  }

  findById(id: ExpenseId): Promise<Expense | null> {
    const stored = this.store.get(id);
    return Promise.resolve(
      stored ? Expense.reconstitute(stored.record) : null,
    );
  }

  findByExpenseNumber(expenseNumber: string): Promise<Expense | null> {
    for (const stored of this.store.values()) {
      if (stored.record.expenseNumber === expenseNumber) {
        return Promise.resolve(Expense.reconstitute(stored.record));
      }
    }

    return Promise.resolve(null);
  }

  async findPaged(query: ExpenseListQuery): Promise<PaginatedResult<Expense>> {
    let items = Array.from(this.store.values()).map((stored) =>
      Expense.reconstitute(stored.record),
    );

    if (query.status !== undefined) {
      items = items.filter((item) => item.status === query.status);
    }

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const start = (page - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);

    return {
      items: paged,
      meta: {
        page,
        pageSize,
        total: items.length,
        totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
      },
    };
  }

  async create(data: CreateExpenseData): Promise<Expense> {
    const normalized = Expense.create(data);
    const now = new Date();
    const id = crypto.randomUUID() as ExpenseId;
    const expense = Expense.reconstitute({
      id,
      ...normalized,
      createdAt: now,
      updatedAt: now,
    });

    this.store.set(id, { record: expense.toProps() });
    return expense;
  }

  async update(
    id: ExpenseId,
    data: UpdateExpenseData,
    existing: Expense,
  ): Promise<Expense> {
    const updated = Expense.reconstitute({
      ...existing.toProps(),
      ...data,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }

  async updateStatus(
    id: ExpenseId,
    data: UpdateExpenseStatusData,
  ): Promise<Expense> {
    const stored = this.store.get(id);

    if (stored === undefined) {
      throw new Error(`Expense not found: ${id}`);
    }

    const existing = Expense.reconstitute(stored.record);
    const updated = Expense.reconstitute({
      ...existing.toProps(),
      status: data.status,
      submittedAt:
        data.submittedAt !== undefined ? data.submittedAt : existing.submittedAt,
      approvedAt:
        data.approvedAt !== undefined ? data.approvedAt : existing.approvedAt,
      rejectedAt:
        data.rejectedAt !== undefined ? data.rejectedAt : existing.rejectedAt,
      paidAt: data.paidAt !== undefined ? data.paidAt : existing.paidAt,
      rejectionReason:
        data.rejectionReason !== undefined
          ? data.rejectionReason
          : existing.rejectionReason,
      approvedById:
        data.approvedById !== undefined
          ? data.approvedById
          : existing.approvedById,
      paidById:
        data.paidById !== undefined ? data.paidById : existing.paidById,
      journalEntryId:
        data.journalEntryId !== undefined
          ? data.journalEntryId
          : existing.journalEntryId,
      updatedAt: new Date(),
    });

    this.store.set(id, { record: updated.toProps() });
    return updated;
  }
}

export class FailingExpenseRepository extends InMemoryExpenseRepository {
  constructor(
    private readonly failOnUpdateStatusAttempt: number,
    private readonly errorMessage = "Simulated expense persistence failure",
  ) {
    super();
  }

  private updateStatusAttempts = 0;

  override async updateStatus(
    id: ExpenseId,
    data: UpdateExpenseStatusData,
  ): Promise<Expense> {
    this.updateStatusAttempts += 1;

    if (this.updateStatusAttempts === this.failOnUpdateStatusAttempt) {
      throw new Error(this.errorMessage);
    }

    return super.updateStatus(id, data);
  }
}
