import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import {
  resolveDbClient,
  withPrismaError,
} from "@/shared/infrastructure/database/repository-base";
import type { ILogger } from "@/shared/infrastructure/logging";

import {
  mapAuditEntryToCreateInput,
  mapAuditFailureEntryToCreateInput,
} from "./audit-entry.mapper";
import { mergeAuditContext } from "./audit-context";
import type {
  AuditContext,
  AuditEntry,
  AuditFailureEntry,
  IAuditLogger,
} from "./audit-logger.interface";

export interface PrismaAuditLoggerOptions {
  prisma: PrismaClient;
  logger?: ILogger;
  defaultContext?: AuditContext;
  tx?: Prisma.TransactionClient;
}

export class PrismaAuditLogger implements IAuditLogger {
  private readonly prisma: PrismaClient;
  private readonly logger?: ILogger;
  private readonly defaultContext: AuditContext;
  private readonly tx?: Prisma.TransactionClient;

  constructor(options: PrismaAuditLoggerOptions) {
    this.prisma = options.prisma;
    this.logger = options.logger;
    this.defaultContext = options.defaultContext ?? {};
    this.tx = options.tx;
  }

  async log(entry: AuditEntry): Promise<void> {
    const db = resolveDbClient(this.tx);
    const data = mapAuditEntryToCreateInput(entry, this.defaultContext);

    try {
      await withPrismaError(async () => {
        await db.auditLog.create({ data });
      });

      this.logger?.debug("Audit log persisted", {
        module: entry.module,
        entityName: entry.entityName,
        recordId: entry.recordId,
        action: entry.action,
        status: entry.status,
        requestId: data.requestId,
      });
    } catch (error) {
      this.logger?.error("Failed to persist audit log", error, {
        module: entry.module,
        entityName: entry.entityName,
        recordId: entry.recordId,
        action: entry.action,
        status: entry.status,
        requestId: data.requestId,
      });

      throw error;
    }
  }

  async logFailure(entry: AuditFailureEntry): Promise<void> {
    const db = resolveDbClient(this.tx);
    const data = mapAuditFailureEntryToCreateInput(entry, this.defaultContext);

    try {
      await withPrismaError(async () => {
        await db.auditLog.create({ data });
      });

      this.logger?.warn("Audit failure recorded", {
        module: entry.module,
        entityName: entry.entityName,
        recordId: entry.recordId,
        action: entry.action,
        requestId: data.requestId,
      });
    } catch (error) {
      this.logger?.error("Failed to persist audit failure log", error, {
        module: entry.module,
        entityName: entry.entityName,
        recordId: entry.recordId,
        action: entry.action,
        requestId: data.requestId,
      });

      throw error;
    }
  }

  withTransaction(tx: Prisma.TransactionClient): PrismaAuditLogger {
    return new PrismaAuditLogger({
      prisma: this.prisma,
      logger: this.logger,
      defaultContext: this.defaultContext,
      tx,
    });
  }

  withContext(context: AuditContext): PrismaAuditLogger {
    return new PrismaAuditLogger({
      prisma: this.prisma,
      logger: this.logger,
      defaultContext: mergeAuditContext(this.defaultContext, context),
      tx: this.tx,
    });
  }
}
