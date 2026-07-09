/**
 * Stock movement module — immutable inventory transaction ledger.
 *
 * Layer exports:
 * - domain: entity, repository contract
 * - application: DTOs, schemas, services
 * - infrastructure: PrismaStockMovementRepository and factories
 * - presentation: route handlers (import from presentation directly)
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";
