import { describe, expect, it } from "vitest";

import { DEFAULT_ACCOUNT_CODES } from "@/modules/accounting/domain/default-account-codes.constants";
import { DOCUMENT_TYPE_PREFIXES } from "@/modules/settings/domain/number-sequence.constants";

import {
  STARTER_ACCOUNTS,
  STARTER_DOCUMENT_TYPES,
  evaluateBusinessSetup,
} from "./business-starter-kit";

const complete = {
  hasActiveCompanyProfile: true,
  documentTypes: [...STARTER_DOCUMENT_TYPES],
  activeAccountCodes: Object.values(DEFAULT_ACCOUNT_CODES),
  unitsOfMeasure: 3,
  expenseCategories: 10,
};

describe("business starter kit", () => {
  it("contains every account that automatic posting needs", () => {
    expect(STARTER_ACCOUNTS.map((account) => account.accountCode).sort()).toEqual(
      Object.values(DEFAULT_ACCOUNT_CODES).sort(),
    );
  });

  it("covers every document type", () => {
    expect([...STARTER_DOCUMENT_TYPES].sort()).toEqual(Object.keys(DOCUMENT_TYPE_PREFIXES).sort());
  });
});

describe("evaluateBusinessSetup", () => {
  it("is ready when everything is present", () => {
    expect(evaluateBusinessSetup(complete)).toMatchObject({
      ready: true,
      missingDefaultAccounts: [],
      missingDocumentTypes: [],
    });
  });

  it("lists missing default accounts and numbering", () => {
    const status = evaluateBusinessSetup({
      ...complete,
      documentTypes: ["RENTAL_ORDER"],
      activeAccountCodes: [DEFAULT_ACCOUNT_CODES.CASH],
    });
    expect(status.ready).toBe(false);
    expect(status.missingDefaultAccounts).toEqual([
      DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
      DEFAULT_ACCOUNT_CODES.RENTAL_REVENUE,
      DEFAULT_ACCOUNT_CODES.GENERAL_EXPENSE,
    ]);
    expect(status.missingDocumentTypes).not.toContain("RENTAL_ORDER");
    expect(status.missingDocumentTypes.length).toBe(STARTER_DOCUMENT_TYPES.length - 1);
  });

  it("is not ready without a company profile or units", () => {
    expect(evaluateBusinessSetup({ ...complete, hasActiveCompanyProfile: false }).ready).toBe(false);
    expect(evaluateBusinessSetup({ ...complete, unitsOfMeasure: 0 }).ready).toBe(false);
  });
});
