/**
 * Notification module — read and mark-read API for existing notification infrastructure.
 *
 * Layer exports:
 * - domain: entity, repository contract, list query, access rules
 * - application: DTOs, schemas, services
 * - infrastructure: PrismaNotificationRepository and factories
 */

export * from "./domain";
export * from "./application";
export * from "./infrastructure";
