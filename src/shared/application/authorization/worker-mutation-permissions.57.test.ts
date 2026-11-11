import { describe, expect, it } from "vitest";

import { USER_ROLES } from "@/constants/roles";

import { PERMISSIONS, ROLE_PERMISSIONS } from "./index";

const WORKER_FINANCIAL_MUTATIONS = [
  PERMISSIONS.rentalInvoices.create,
  PERMISSIONS.rentalInvoices.update,
  PERMISSIONS.rentalInvoices.issue,
  PERMISSIONS.rentalInvoices.void,
  PERMISSIONS.payments.create,
  PERMISSIONS.payments.update,
  PERMISSIONS.payments.post,
  PERMISSIONS.payments.void,
  PERMISSIONS.supplierPayments.create,
  PERMISSIONS.supplierPayments.post,
  PERMISSIONS.supplierPayments.void,
] as const;

const WORKER_OPERATIONAL_MUTATIONS = [
  PERMISSIONS.dispatches.create,
  PERMISSIONS.dispatches.update,
  PERMISSIONS.dispatches.complete,
  PERMISSIONS.dispatches.cancel,
  PERMISSIONS.returns.create,
  PERMISSIONS.returns.update,
  PERMISSIONS.returns.receive,
  PERMISSIONS.returns.inspect,
  PERMISSIONS.returns.complete,
  PERMISSIONS.returns.cancel,
  PERMISSIONS.stockMovements.create,
  PERMISSIONS.inventory.adjust,
] as const;

const WORKER_FINANCIAL_READS = [
  PERMISSIONS.rentalInvoices.read,
  PERMISSIONS.payments.read,
  PERMISSIONS.supplierPayments.read,
] as const;

describe("Phase 57 F-11 — WORKER mutation permission granularity", () => {
  describe("financial mutations removed from WORKER", () => {
    it.each(WORKER_FINANCIAL_MUTATIONS)(
      "T57.1 denies WORKER %s",
      (permission) => {
        expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).not.toContain(permission);
      },
    );

    it.each(WORKER_FINANCIAL_MUTATIONS)(
      "T57.1 allows MANAGER %s",
      (permission) => {
        expect(ROLE_PERMISSIONS[USER_ROLES.MANAGER]).toContain(permission);
      },
    );

    it.each(WORKER_FINANCIAL_MUTATIONS)(
      "T57.1 allows ACCOUNTANT %s",
      (permission) => {
        expect(ROLE_PERMISSIONS[USER_ROLES.ACCOUNTANT]).toContain(permission);
      },
    );
  });

  describe("operational mutations preserved for WORKER", () => {
    it.each(WORKER_OPERATIONAL_MUTATIONS)(
      "T57.2 allows WORKER %s",
      (permission) => {
        expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(permission);
      },
    );
  });

  describe("financial read access preserved for WORKER", () => {
    it.each(WORKER_FINANCIAL_READS)(
      "T57.3 allows WORKER read %s",
      (permission) => {
        expect(ROLE_PERMISSIONS[USER_ROLES.WORKER]).toContain(permission);
      },
    );
  });
});
