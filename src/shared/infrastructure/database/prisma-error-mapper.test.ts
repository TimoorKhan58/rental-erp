import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/shared/infrastructure/errors";
import { CrossOrganizationWriteError } from "@/shared/infrastructure/tenancy/organization-scope";

import { mapPrismaError } from "./prisma-error-mapper";

describe("mapPrismaError — references to another business (SaaS phase 2)", () => {
  it("reports the database trigger's rejection as not found", () => {
    const error = new Prisma.PrismaClientUnknownRequestError(
      "ERROR: RENTCORE_CROSS_ORGANIZATION_REFERENCE: rental_orders.customerId references a customers row of another organization",
      { clientVersion: "test" },
    );

    const mapped = mapPrismaError(error);

    expect(mapped).toBeInstanceOf(NotFoundError);
    expect(mapped.message).toBe("Requested resource was not found.");
    expect(mapped.message).not.toContain("organization");
  });

  it("reports the guard's rejection as not found", () => {
    expect(mapPrismaError(new CrossOrganizationWriteError("Customer"))).toBeInstanceOf(
      NotFoundError,
    );
  });
});
