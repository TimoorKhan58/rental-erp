import { describe, expect, it } from "vitest";

import {
  AccountIdParamSchema,
  CreateAccountSchema,
  UpdateAccountSchema,
} from "@/modules/accounting/application/schemas/account.schemas";
import { ListAccountsSchema } from "@/modules/accounting/application/schemas/list-accounts.schema";

import {
  ACCOUNT_ID,
  VALID_CREATE_ACCOUNT_INPUT,
} from "./helpers/account.fixtures";

describe("CreateAccountSchema", () => {
  it("accepts valid create input", () => {
    const result = CreateAccountSchema.parse(VALID_CREATE_ACCOUNT_INPUT);

    expect(result.accountCode).toBe("1000");
    expect(result.name).toBe("Cash");
    expect(result.accountType).toBe("ASSET");
    expect(result.isActive).toBe(true);
  });

  it("rejects empty account code", () => {
    expect(() =>
      CreateAccountSchema.parse({
        ...VALID_CREATE_ACCOUNT_INPUT,
        accountCode: "",
      }),
    ).toThrow();
  });

  it("rejects empty account name", () => {
    expect(() =>
      CreateAccountSchema.parse({
        ...VALID_CREATE_ACCOUNT_INPUT,
        name: "",
      }),
    ).toThrow();
  });

  it("rejects invalid account type", () => {
    expect(() =>
      CreateAccountSchema.parse({
        ...VALID_CREATE_ACCOUNT_INPUT,
        accountType: "INVALID",
      }),
    ).toThrow();
  });

  it("accepts null description", () => {
    const result = CreateAccountSchema.parse({
      ...VALID_CREATE_ACCOUNT_INPUT,
      description: null,
    });

    expect(result.description).toBeNull();
  });

  it("accepts all valid account types", () => {
    for (const accountType of [
      "ASSET",
      "LIABILITY",
      "EQUITY",
      "INCOME",
      "EXPENSE",
    ] as const) {
      const result = CreateAccountSchema.parse({
        ...VALID_CREATE_ACCOUNT_INPUT,
        accountType,
      });

      expect(result.accountType).toBe(accountType);
    }
  });

  it("rejects account code over 50 characters", () => {
    expect(() =>
      CreateAccountSchema.parse({
        ...VALID_CREATE_ACCOUNT_INPUT,
        accountCode: "x".repeat(51),
      }),
    ).toThrow();
  });

  it("rejects name over 200 characters", () => {
    expect(() =>
      CreateAccountSchema.parse({
        ...VALID_CREATE_ACCOUNT_INPUT,
        name: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("defaults isActive when omitted", () => {
    const { isActive: _ignored, ...withoutActive } = VALID_CREATE_ACCOUNT_INPUT;
    const result = CreateAccountSchema.parse(withoutActive);

    expect(result.isActive).toBeUndefined();
  });
});

describe("UpdateAccountSchema", () => {
  it("accepts name update", () => {
    const result = UpdateAccountSchema.parse({ name: "Updated Cash" });

    expect(result.name).toBe("Updated Cash");
  });

  it("accepts account type update", () => {
    const result = UpdateAccountSchema.parse({ accountType: "EXPENSE" });

    expect(result.accountType).toBe("EXPENSE");
  });

  it("accepts isActive update", () => {
    const result = UpdateAccountSchema.parse({ isActive: false });

    expect(result.isActive).toBe(false);
  });

  it("rejects empty update payload", () => {
    expect(() => UpdateAccountSchema.parse({})).toThrow();
  });

  it("accepts description update", () => {
    const result = UpdateAccountSchema.parse({
      description: "Updated description",
    });

    expect(result.description).toBe("Updated description");
  });

  it("accepts null description on update", () => {
    const result = UpdateAccountSchema.parse({ description: null });

    expect(result.description).toBeNull();
  });

  it("rejects empty name on update", () => {
    expect(() => UpdateAccountSchema.parse({ name: "" })).toThrow();
  });
});

describe("AccountIdParamSchema", () => {
  it("accepts valid account id", () => {
    const result = AccountIdParamSchema.parse({ id: ACCOUNT_ID });

    expect(result.id).toBe(ACCOUNT_ID);
  });

  it("rejects invalid account id", () => {
    expect(() => AccountIdParamSchema.parse({ id: "bad" })).toThrow();
  });
});

describe("ListAccountsSchema", () => {
  it("accepts valid list query", () => {
    const result = ListAccountsSchema.parse({
      page: "1",
      pageSize: "20",
      sortOrder: "desc",
    });

    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("accepts account type filter", () => {
    const result = ListAccountsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      accountType: "ASSET",
    });

    expect(result.accountType).toBe("ASSET");
  });

  it("accepts isActive filter true", () => {
    const result = ListAccountsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      isActive: "true",
    });

    expect(result.isActive).toBe(true);
  });

  it("accepts isActive filter false", () => {
    const result = ListAccountsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "desc",
      isActive: "false",
    });

    expect(result.isActive).toBe(false);
  });

  it("rejects search term over 200 characters", () => {
    expect(() =>
      ListAccountsSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        search: "x".repeat(201),
      }),
    ).toThrow();
  });

  it("accepts sortBy field", () => {
    const result = ListAccountsSchema.parse({
      page: "1",
      pageSize: "10",
      sortOrder: "asc",
      sortBy: "accountCode",
    });

    expect(result.sortBy).toBe("accountCode");
  });

  it("rejects invalid account type filter", () => {
    expect(() =>
      ListAccountsSchema.parse({
        page: "1",
        pageSize: "10",
        sortOrder: "desc",
        accountType: "INVALID",
      }),
    ).toThrow();
  });
});
