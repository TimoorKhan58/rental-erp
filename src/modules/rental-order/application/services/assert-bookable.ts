import type { DbClient } from "@/shared/infrastructure/database/prisma-types";
import { UnprocessableError } from "@/shared/infrastructure/errors";

/**
 * A new or changed order may only use an active customer and active products
 * (A-to-Z test 2026-11-19: inactive ones could still be booked). Missing ids
 * are left to the normal "does not exist" checks.
 */
export async function assertBookable(
  db: DbClient,
  input: { customerId?: string; productIds?: readonly string[] },
): Promise<void> {
  if (input.customerId !== undefined) {
    const customer = await db.customer.findUnique({
      where: { id: input.customerId },
      select: { isActive: true, name: true },
    });
    if (customer !== null && !customer.isActive) {
      throw new UnprocessableError({
        message: `${customer.name} is inactive. Activate the customer before booking an order.`,
        details: { field: "customerId" },
      });
    }
  }

  const productIds = [...new Set(input.productIds ?? [])];
  if (productIds.length > 0) {
    const inactive = await db.product.findMany({
      where: { id: { in: productIds }, isActive: false },
      select: { name: true },
    });
    if (inactive.length > 0) {
      throw new UnprocessableError({
        message: `${inactive.map((product) => product.name).join(", ")} ${inactive.length === 1 ? "is" : "are"} inactive and can't be booked.`,
        details: { field: "items" },
      });
    }
  }
}
