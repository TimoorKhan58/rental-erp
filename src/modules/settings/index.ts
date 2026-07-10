/**
 * Settings module — company configuration, system settings, and document sequences.
 *
 * Layer exports:
 * - domain: entities, value objects, repository contracts
 * - application: DTOs, schemas, service contract
 * - infrastructure: Prisma repositories and factories
 * - presentation: route handlers and API mappers
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";

// Presentation exports are available but not re-exported from the module root
// to keep the public API focused on domain/application/infrastructure contracts.
