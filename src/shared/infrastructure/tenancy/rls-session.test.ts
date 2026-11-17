import { describe, expect, it, vi } from "vitest";

import { runAsSystem, runInOrganization, type OrganizationScope } from "./organization-scope";
import {
  TenantTransactionError,
  getRlsTransaction,
  planRlsQuery,
  rlsSettingsFor,
  runTenantTransaction,
} from "./rls-session";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";
const A: OrganizationScope = { kind: "organization", organizationId: ORG_A };
const B: OrganizationScope = { kind: "organization", organizationId: ORG_B };
const SYSTEM: OrganizationScope = { kind: "system", reason: "test" };

describe("rlsSettingsFor", () => {
  it("maps a business, system code and no scope", () => {
    expect(rlsSettingsFor(A)).toEqual({ key: `org:${ORG_A}`, organizationId: ORG_A, system: "" });
    expect(rlsSettingsFor(SYSTEM)).toEqual({ key: "system", organizationId: "", system: "on" });
    expect(rlsSettingsFor(undefined)).toBeUndefined();
  });
});

describe("planRlsQuery", () => {
  it("wraps a query outside a transaction with the business", () => {
    expect(
      planRlsQuery({ model: "Customer", transactionKind: undefined, scope: A, transaction: undefined }),
    ).toEqual({ action: "wrap", settings: rlsSettingsFor(A) });
  });

  it("wraps raw SQL too (no model)", () => {
    expect(
      planRlsQuery({ model: undefined, transactionKind: undefined, scope: A, transaction: undefined }),
    ).toMatchObject({ action: "wrap" });
  });

  it("runs as is with no scope (fails closed in the database)", () => {
    expect(
      planRlsQuery({ model: "Customer", transactionKind: undefined, scope: undefined, transaction: undefined }),
    ).toEqual({ action: "run" });
  });

  it("runs as is inside its own batch wrapper", () => {
    expect(
      planRlsQuery({ model: "Customer", transactionKind: "batch", scope: A, transaction: undefined }),
    ).toEqual({ action: "run" });
  });

  it("runs as is inside a transaction started for the same business", () => {
    expect(
      planRlsQuery({
        model: "Customer",
        transactionKind: "itx",
        scope: A,
        transaction: { key: `org:${ORG_A}` },
      }),
    ).toEqual({ action: "run" });
  });

  it("refuses business data in a transaction not started with runTenantTransaction", () => {
    expect(() =>
      planRlsQuery({ model: "Customer", transactionKind: "itx", scope: A, transaction: undefined }),
    ).toThrow(TenantTransactionError);
  });

  it("allows platform tables in such a transaction (e.g. sign-in)", () => {
    expect(
      planRlsQuery({ model: "AuthSession", transactionKind: "itx", scope: SYSTEM, transaction: undefined }),
    ).toEqual({ action: "run" });
  });

  it("refuses a scope change inside a transaction", () => {
    expect(() =>
      planRlsQuery({
        model: "Customer",
        transactionKind: "itx",
        scope: B,
        transaction: { key: `org:${ORG_A}` },
      }),
    ).toThrow(TenantTransactionError);
  });
});

describe("runTenantTransaction", () => {
  function fakeClient() {
    const executed: unknown[][] = [];
    const tx = {
      $executeRaw: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
        executed.push([strings.join("?"), ...values]);
        return Promise.resolve(1);
      }),
    };
    const client = {
      $transaction: vi.fn(<R>(operation: (t: typeof tx) => Promise<R>) => operation(tx)),
    };
    return { client, tx, executed };
  }

  it("sets the business on the transaction before the work runs", async () => {
    const { client, executed } = fakeClient();
    const seen: unknown[] = [];

    await runInOrganization(ORG_A, () =>
      runTenantTransaction(client, async () => {
        seen.push(getRlsTransaction());
        return "done";
      }),
    );

    expect(executed).toHaveLength(1);
    expect(executed[0]?.[0]).toContain("set_config('rentcore.organization_id'");
    expect(executed[0]?.slice(1)).toEqual([ORG_A, ""]);
    expect(seen).toEqual([{ key: `org:${ORG_A}` }]);
  });

  it("marks system transactions as system", async () => {
    const { client, executed } = fakeClient();
    await runAsSystem("test", () => runTenantTransaction(client, async () => null));
    expect(executed[0]?.slice(1)).toEqual(["", "on"]);
  });

  it("sets nothing without a scope", async () => {
    const { client, executed } = fakeClient();
    await runTenantTransaction(client, async () => null);
    expect(executed).toHaveLength(0);
  });
});
