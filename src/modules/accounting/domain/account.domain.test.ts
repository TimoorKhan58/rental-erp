import { describe, expect, it } from "vitest";

import { Account } from "@/modules/accounting/domain/account.entity";
import { ACCOUNT_TYPES } from "@/modules/accounting/domain/account.constants";
import {
  AccountEligibilityError,
  AccountInvariantError,
  createAccountCode,
  createAccountName,
} from "@/modules/accounting/domain/account.errors";
import {
  assertAccountActive,
  normalizeCreateAccountData,
  normalizeUpdateAccountData,
} from "@/modules/accounting/domain/account.rules";

import {
  ACCOUNT_ID,
  buildAccountEntity,
  buildCreateAccountData,
  buildInactiveAccountEntity,
  VALID_CREATE_ACCOUNT_INPUT,
} from "../tests/helpers/account.fixtures";

describe("Account entity", () => {
  it("creates normalized account props", () => {
    const props = Account.create(buildCreateAccountData());

    expect(props.accountCode).toBe("1000");
    expect(props.name).toBe("Cash");
    expect(props.accountType).toBe("ASSET");
    expect(props.description).toBe("Main cash account");
    expect(props.isActive).toBe(true);
  });

  it("rejects empty account code", () => {
    expect(() =>
      Account.create(buildCreateAccountData({ accountCode: "   " })),
    ).toThrow(AccountInvariantError);
  });

  it("rejects empty account name", () => {
    expect(() =>
      Account.create(buildCreateAccountData({ name: "   " })),
    ).toThrow(AccountInvariantError);
  });

  it("trims account code on create", () => {
    const props = Account.create(
      buildCreateAccountData({ accountCode: "  1100  " }),
    );

    expect(props.accountCode).toBe("1100");
  });

  it("trims account name on create", () => {
    const props = Account.create(
      buildCreateAccountData({ name: "  Petty Cash  " }),
    );

    expect(props.name).toBe("Petty Cash");
  });

  it("defaults isActive to true when omitted", () => {
    const props = Account.create({
      accountCode: "3000",
      name: "Revenue",
      accountType: "INCOME",
    });

    expect(props.isActive).toBe(true);
  });

  it("accepts explicit isActive false", () => {
    const props = Account.create(
      buildCreateAccountData({ isActive: false }),
    );

    expect(props.isActive).toBe(false);
  });

  it("normalizes blank description to null", () => {
    const props = Account.create(
      buildCreateAccountData({ description: "   " }),
    );

    expect(props.description).toBeNull();
  });

  it("normalizes undefined description to null", () => {
    const props = Account.create(
      buildCreateAccountData({ description: undefined }),
    );

    expect(props.description).toBeNull();
  });

  it("reconstitutes persisted account", () => {
    const account = buildAccountEntity();

    expect(account.id).toBe(ACCOUNT_ID);
    expect(account.accountCode).toBe("1000");
    expect(account.isActive).toBe(true);
  });

  it("updates account name", () => {
    const account = buildAccountEntity();
    const updated = account.withUpdated({ name: "Updated Cash" });

    expect(updated.name).toBe("Updated Cash");
    expect(updated.accountCode).toBe(account.accountCode);
  });

  it("updates account type", () => {
    const account = buildAccountEntity();
    const updated = account.withUpdated({ accountType: "LIABILITY" });

    expect(updated.accountType).toBe("LIABILITY");
  });

  it("updates description", () => {
    const account = buildAccountEntity();
    const updated = account.withUpdated({ description: "New description" });

    expect(updated.description).toBe("New description");
  });

  it("clears description when set to null", () => {
    const account = buildAccountEntity();
    const updated = account.withUpdated({ description: null });

    expect(updated.description).toBeNull();
  });

  it("deactivates account", () => {
    const account = buildAccountEntity();
    const updated = account.withUpdated({ isActive: false });

    expect(updated.isActive).toBe(false);
  });

  it("preserves unchanged fields on partial update", () => {
    const account = buildAccountEntity();
    const updated = account.withUpdated({ name: "Only name changed" });

    expect(updated.accountType).toBe(account.accountType);
    expect(updated.description).toBe(account.description);
    expect(updated.isActive).toBe(account.isActive);
  });

  it("toProps returns full account state", () => {
    const account = buildAccountEntity();
    const props = account.toProps();

    expect(props.id).toBe(ACCOUNT_ID);
    expect(props.accountCode).toBe("1000");
    expect(props.name).toBe("Cash");
    expect(props.createdAt).toBeInstanceOf(Date);
    expect(props.updatedAt).toBeInstanceOf(Date);
  });

  it("accepts all account types on create", () => {
    for (const accountType of ACCOUNT_TYPES) {
      const props = Account.create(
        buildCreateAccountData({ accountType, accountCode: `T-${accountType}` }),
      );

      expect(props.accountType).toBe(accountType);
    }
  });
});

describe("Account rules and errors", () => {
  it("createAccountCode trims and validates", () => {
    expect(createAccountCode("  1000  ")).toBe("1000");
    expect(() => createAccountCode("   ")).toThrow(AccountInvariantError);
  });

  it("createAccountName trims and validates", () => {
    expect(createAccountName("  Cash  ")).toBe("Cash");
    expect(() => createAccountName("   ")).toThrow(AccountInvariantError);
  });

  it("assertAccountActive allows active accounts", () => {
    expect(() => assertAccountActive(true)).not.toThrow();
  });

  it("assertAccountActive rejects inactive accounts", () => {
    expect(() => assertAccountActive(false)).toThrow(AccountEligibilityError);
  });

  it("normalizeCreateAccountData trims fields", () => {
    const normalized = normalizeCreateAccountData({
      accountCode: "  2000 ",
      name: " Expense ",
      accountType: "EXPENSE",
      description: "  notes  ",
    });

    expect(normalized.accountCode).toBe("2000");
    expect(normalized.name).toBe("Expense");
    expect(normalized.description).toBe("notes");
  });

  it("normalizeUpdateAccountData trims name", () => {
    const normalized = normalizeUpdateAccountData({ name: "  Updated  " });

    expect(normalized.name).toBe("Updated");
  });

  it("inactive account entity has isActive false", () => {
    const account = buildInactiveAccountEntity();

    expect(account.isActive).toBe(false);
    expect(account.accountType).toBe("EXPENSE");
  });

  it("AccountInvariantError includes field name", () => {
    try {
      createAccountCode("");
    } catch (error) {
      expect(error).toBeInstanceOf(AccountInvariantError);
      expect((error as AccountInvariantError).field).toBe("accountCode");
    }
  });

  it("VALID_CREATE_ACCOUNT_INPUT matches entity defaults", () => {
    const props = Account.create(buildCreateAccountData());
    const account = buildAccountEntity();

    expect(props.accountCode).toBe(VALID_CREATE_ACCOUNT_INPUT.accountCode);
    expect(account.name).toBe(VALID_CREATE_ACCOUNT_INPUT.name);
  });

  it("reconstitute normalizes persisted props", () => {
    const account = Account.reconstitute({
      id: ACCOUNT_ID,
      accountCode: "  1000 ",
      name: " Cash ",
      accountType: "ASSET",
      description: "  Main cash account  ",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    expect(account.accountCode).toBe("1000");
    expect(account.name).toBe("Cash");
    expect(account.description).toBe("Main cash account");
  });
});
