/**
 * Customer module — first vertical slice reference implementation.
 *
 * Layer exports:
 * - domain: entity, value objects, repository contract
 * - application: DTOs, schemas, service contract (Phase 5-002)
 * - infrastructure: PrismaCustomerRepository and factories
 * - presentation: route/handler placeholders (Phase 5-002)
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";

// Presentation exports are available but not re-exported from the module root
// to keep the public API focused on domain/application/infrastructure contracts.
