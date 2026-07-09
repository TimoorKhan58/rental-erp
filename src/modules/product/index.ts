/**
 * Product module — product catalog vertical slice.
 *
 * Layer exports:
 * - domain: entity, value objects, repository contract
 * - application: DTOs, schemas, services
 * - infrastructure: PrismaProductRepository and factories
 * - presentation: route handlers (import from presentation directly)
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";
