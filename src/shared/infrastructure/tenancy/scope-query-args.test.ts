import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  CrossOrganizationWriteError,
  OrganizationScopeMissingError,
  type OrganizationScope,
} from "./organization-scope";
import { scopeQueryArgs } from "./scope-query-args";
import { MODEL_RELATIONS, TENANT_MODELS } from "./tenant-model-map";

const ORG_A = "00000000-0000-4000-8000-00000000000a";
const ORG_B = "00000000-0000-4000-8000-00000000000b";
const A: OrganizationScope = { kind: "organization", organizationId: ORG_A };
const SYSTEM: OrganizationScope = { kind: "system", reason: "test" };

describe("scopeQueryArgs — reads", () => {
  it("adds the organization to unique lookups", () => {
    expect(scopeQueryArgs("RentalOrder", "findUnique", { where: { id: "o1" } }, A)).toEqual({
      where: { id: "o1", organizationId: ORG_A },
    });
  });

  it("cannot be talked into another organization's unique lookup", () => {
    expect(
      scopeQueryArgs("RentalOrder", "findUnique", { where: { id: "o1", organizationId: ORG_B } }, A),
    ).toEqual({ where: { id: "o1", organizationId: ORG_A } });
  });

  it("AND-s the organization onto list filters, keeping the original filter", () => {
    const where = { status: "RESERVED", OR: [{ orderNumber: "RO-1" }] };
    expect(scopeQueryArgs("RentalOrder", "findMany", { where, take: 5 }, A)).toEqual({
      where: { AND: [where, { organizationId: ORG_A }] },
      take: 5,
    });
  });

  it.each(["findFirst", "count", "aggregate", "groupBy", "deleteMany", "updateMany"])(
    "scopes %s with no where at all",
    (operation) => {
      expect(scopeQueryArgs("Customer", operation, {}, A)).toMatchObject({
        where: { organizationId: ORG_A },
      });
    },
  );

  it("leaves platform tables alone", () => {
    const args = { where: { email: "x@example.test" } };
    expect(scopeQueryArgs("AuthUser", "findFirst", args, A)).toEqual(args);
    expect(scopeQueryArgs("Role", "findMany", undefined, undefined)).toBeUndefined();
  });
});

describe("scopeQueryArgs — writes", () => {
  it("stamps the organization on a simple create", () => {
    expect(
      scopeQueryArgs("Customer", "create", { data: { name: "Ali", phone: "0300" } }, A),
    ).toEqual({ data: { name: "Ali", phone: "0300", organizationId: ORG_A } });
  });

  it("uses a relation connect when the create uses relation objects", () => {
    const result = scopeQueryArgs(
      "RentalOrder",
      "create",
      { data: { orderNumber: "RO-1", customer: { connect: { id: "c1" } } } },
      A,
    ) as { data: Record<string, unknown> };

    expect(result.data.organization).toEqual({ connect: { id: ORG_A } });
    expect(result.data.organizationId).toBeUndefined();
  });

  it("stamps nested child rows created with their parent", () => {
    const result = scopeQueryArgs(
      "RentalOrder",
      "create",
      {
        data: {
          orderNumber: "RO-1",
          customerId: "c1",
          items: { create: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }] },
        },
      },
      A,
    ) as { data: { items: { create: Array<Record<string, unknown>> } } };

    expect(result.data.items.create.map((item) => item.organizationId)).toEqual([ORG_A, ORG_A]);
  });

  it("stamps nested createMany rows", () => {
    const result = scopeQueryArgs(
      "RentalInvoice",
      "create",
      { data: { invoiceNumber: "INV-1", items: { createMany: { data: [{ description: "x" }] } } } },
      A,
    ) as { data: { items: { createMany: { data: Array<Record<string, unknown>> } } } };

    expect(result.data.items.createMany.data[0]?.organizationId).toBe(ORG_A);
  });

  it("stamps createMany rows", () => {
    expect(
      scopeQueryArgs("InventoryTransaction", "createMany", { data: [{ quantity: 1 }, { quantity: 2 }] }, A),
    ).toEqual({
      data: [
        { quantity: 1, organizationId: ORG_A },
        { quantity: 2, organizationId: ORG_A },
      ],
    });
  });

  it("scopes upsert lookups and both branches", () => {
    const result = scopeQueryArgs(
      "Customer",
      "upsert",
      { where: { id: "c1" }, create: { name: "Ali" }, update: { name: "Ali K" } },
      A,
    ) as Record<string, Record<string, unknown>>;

    expect(result.where).toEqual({ id: "c1", organizationId: ORG_A });
    expect(result.create).toMatchObject({ organizationId: ORG_A });
  });

  it("stamps rows created inside a nested update", () => {
    const result = scopeQueryArgs(
      "ReturnInspection",
      "update",
      { where: { id: "r1" }, data: { items: { create: { returnedQuantity: 1 } } } },
      A,
    ) as { data: { items: { create: Record<string, unknown> } } };

    expect(result.data.items.create.organizationId).toBe(ORG_A);
  });

  it("refuses to write a row for another organization", () => {
    expect(() =>
      scopeQueryArgs("Customer", "create", { data: { name: "x", organizationId: ORG_B } }, A),
    ).toThrow(CrossOrganizationWriteError);
    expect(() =>
      scopeQueryArgs("Customer", "update", { where: { id: "c1" }, data: { organizationId: ORG_B } }, A),
    ).toThrow(CrossOrganizationWriteError);
    expect(() =>
      scopeQueryArgs(
        "RentalOrder",
        "create",
        { data: { items: { create: [{ organizationId: ORG_B }] } } },
        A,
      ),
    ).toThrow(CrossOrganizationWriteError);
  });
});

describe("scopeQueryArgs — fail closed", () => {
  it("refuses per-business data without a scope", () => {
    expect(() => scopeQueryArgs("Customer", "findMany", {}, undefined)).toThrow(
      OrganizationScopeMissingError,
    );
  });

  it("lets explicit system code through unchanged", () => {
    const args = { where: { id: "u1" } };
    expect(scopeQueryArgs("User", "findUnique", args, SYSTEM)).toEqual(args);
  });
});

describe("tenant model map", () => {
  it("matches prisma/schema.prisma (regenerate with scripts/tenancy/generate-tenant-model-map.mjs)", async () => {
    // @ts-expect-error — plain ESM helper shared with the generator script.
    const { readTenantModelMap } = await import("../../../../scripts/tenancy/read-tenant-model-map.mjs");
    const fromSchema = readTenantModelMap(path.resolve(process.cwd(), "prisma/schema.prisma"));

    expect([...TENANT_MODELS].sort()).toEqual(fromSchema.tenantModels);
    expect(MODEL_RELATIONS).toEqual(fromSchema.relations);
  });

  it("covers the 49 per-business tables and not the platform ones", () => {
    expect(TENANT_MODELS.size).toBe(49);
    for (const platform of ["AuthUser", "AuthSession", "Role", "SystemSetting", "Organization"]) {
      expect(TENANT_MODELS.has(platform)).toBe(false);
    }
  });
});
