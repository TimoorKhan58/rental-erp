/**
 * Inventory module — inventory stock vertical slice.
 *
 * Layer exports:
 * - domain: entity, repository contract
 * - application: DTOs, schemas, services
 * - infrastructure: PrismaInventoryRepository and factories
 * - presentation: route handlers (import from presentation directly)
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";
