/**
 * Asset module — fixed asset management vertical slice.
 *
 * Layer exports:
 * - domain: entity, value objects, repository contract
 * - application: DTOs, schemas, services
 * - infrastructure: Prisma repositories and factories
 * - presentation: route handlers (import from presentation directly)
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";
