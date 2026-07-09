import { describe, expect, it } from "vitest";

import { AccountEligibilityError } from "@/modules/accounting/domain/account.errors";
import { assertAccountActive } from "@/modules/accounting/domain/account.rules";

import {
  buildAccountEntity,
  buildInactiveAccountEntity,
} from "../tests/helpers/account.fixtures";

describe("assertAccountActive", () => {
  it("allows active account flag", () => {
    expect(() => assertAccountActive(true)).not.toThrow();
  });

  it("rejects inactive account flag", () => {
    expect(() => assertAccountActive(false)).toThrow(AccountEligibilityError);
  });

  it("throws AccountEligibilityError with descriptive message", () => {
    try {
      assertAccountActive(false);
    } catch (error) {
      expect(error).toBeInstanceOf(AccountEligibilityError);
      expect((error as AccountEligibilityError).message).toBe(
        "Inactive accounts cannot receive journal lines",
      );
    }
  });

  it("active account entity passes eligibility check", () => {
    const account = buildAccountEntity();

    expect(() => assertAccountActive(account.isActive)).not.toThrow();
  });

  it("inactive account entity fails eligibility check", () => {
    const account = buildInactiveAccountEntity();

    expect(() => assertAccountActive(account.isActive)).toThrow(
      AccountEligibilityError,
    );
  });
});

describe("account active status edge cases", () => {
  it("deactivated account becomes ineligible", () => {
    const account = buildAccountEntity();
    const deactivated = account.withUpdated({ isActive: false });

    expect(() => assertAccountActive(deactivated.isActive)).toThrow(
      AccountEligibilityError,
    );
  });

  it("reactivated account becomes eligible again", () => {
    const account = buildInactiveAccountEntity();
    const reactivated = account.withUpdated({ isActive: true });

    expect(() => assertAccountActive(reactivated.isActive)).not.toThrow();
  });

  it("AccountEligibilityError has correct name", () => {
    try {
      assertAccountActive(false);
    } catch (error) {
      expect((error as Error).name).toBe("AccountEligibilityError");
    }
  });
});
