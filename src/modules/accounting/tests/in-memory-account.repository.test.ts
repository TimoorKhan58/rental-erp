import { describe, expect, it } from "vitest";

import { InMemoryAccountRepository } from "./helpers/in-memory-account.repository";
import {
  ACCOUNT_ID,
  CASH_ACCOUNT_ID,
  buildAccountEntity,
  buildCashAccountEntity,
  buildCreateAccountData,
  buildInactiveAccountEntity,
} from "./helpers/account.fixtures";

describe("InMemoryAccountRepository", () => {
  it("finds account by id", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed([buildAccountEntity()]);

    const found = await repository.findById(ACCOUNT_ID);

    expect(found?.accountCode).toBe("1000");
  });

  it("finds account by account code", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed([buildAccountEntity()]);

    const found = await repository.findByAccountCode("1000");

    expect(found?.id).toBe(ACCOUNT_ID);
  });

  it("creates account with generated id", async () => {
    const repository = new InMemoryAccountRepository();

    const created = await repository.create(buildCreateAccountData());

    expect(created.accountCode).toBe("1000");
    expect(created.isActive).toBe(true);
    expect(repository.count()).toBe(1);
  });

  it("updates account fields", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed([buildAccountEntity()]);

    const updated = await repository.update(ACCOUNT_ID, {
      name: "Updated Cash",
      isActive: false,
    });

    expect(updated.name).toBe("Updated Cash");
    expect(updated.isActive).toBe(false);
  });

  it("filters paged results by account type", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed([
      buildAccountEntity(),
      buildInactiveAccountEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      accountType: "EXPENSE",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.accountType).toBe("EXPENSE");
  });

  it("filters paged results by isActive", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed([
      buildAccountEntity(),
      buildInactiveAccountEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      isActive: false,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.isActive).toBe(false);
  });

  it("filters paged results by search term", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed([buildAccountEntity(), buildCashAccountEntity()]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "desc",
      search: "petty",
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe(CASH_ACCOUNT_ID);
  });

  it("sorts paged results by account code", async () => {
    const repository = new InMemoryAccountRepository();
    repository.seed([
      buildCashAccountEntity(),
      buildAccountEntity(),
    ]);

    const result = await repository.findPaged({
      page: 1,
      pageSize: 10,
      sortOrder: "asc",
      sortBy: "accountCode",
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.accountCode).toBe("1000");
  });

  it("returns null when account not found", async () => {
    const repository = new InMemoryAccountRepository();

    const found = await repository.findById(ACCOUNT_ID);

    expect(found).toBeNull();
  });

  it("throws when updating missing account", async () => {
    const repository = new InMemoryAccountRepository();

    await expect(
      repository.update(ACCOUNT_ID, { name: "Missing" }),
    ).rejects.toThrow("Account not found");
  });
});
