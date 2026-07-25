import { normalizeSearchTerm } from "@/shared/infrastructure/database/repository/query/build-search";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type InventorySearchClause = {
  OR: Array<Record<string, unknown>>;
};

/**
 * Inventory list search targets related product/warehouse text fields.
 * The inventory row itself only carries UUID ids, and Prisma/Postgres reject
 * `contains` on @db.Uuid columns — so free text must go through the relations.
 */
export function buildInventorySearchClause(
  search?: string,
): InventorySearchClause | undefined {
  const term = normalizeSearchTerm(search);

  if (term === undefined) {
    return undefined;
  }

  const clauses: Array<Record<string, unknown>> = [
    { product: { productCode: { contains: term, mode: "insensitive" } } },
    { product: { name: { contains: term, mode: "insensitive" } } },
    { warehouse: { warehouseCode: { contains: term, mode: "insensitive" } } },
    { warehouse: { name: { contains: term, mode: "insensitive" } } },
  ];

  if (UUID_PATTERN.test(term)) {
    clauses.push({ productId: term }, { warehouseId: term });
  }

  return { OR: clauses };
}
