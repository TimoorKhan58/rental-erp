import type { Prisma } from "@/generated/prisma/client";
import {
  AuditAction as PrismaAuditAction,
  AuditStatus as PrismaAuditStatus,
} from "@/generated/prisma/client";

import { mergeAuditContext } from "./audit-context";
import type {
  AuditAction,
  AuditContext,
  AuditEntry,
  AuditFailureEntry,
  AuditStatus,
  AuditValues,
} from "./audit-logger.interface";
import { extractAuditErrorMessage } from "./audit-error-message";

function toPrismaAuditAction(action: AuditAction): PrismaAuditAction {
  return action as PrismaAuditAction;
}

function toPrismaAuditStatus(status: AuditStatus): PrismaAuditStatus {
  return status as PrismaAuditStatus;
}

function toPrismaJson(
  value: AuditValues | undefined,
): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value as Prisma.InputJsonValue;
}

export function mapAuditEntryToCreateInput(
  entry: AuditEntry,
  context: AuditContext = {},
): Prisma.AuditLogUncheckedCreateInput {
  const metadata = mergeAuditContext(context, {
    module: entry.module,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    requestId: entry.requestId,
  });

  return {
    userId: metadata.userId,
    module: entry.module,
    entityName: entry.entityName,
    recordId: entry.recordId,
    action: toPrismaAuditAction(entry.action),
    status: toPrismaAuditStatus(entry.status),
    oldValues: toPrismaJson(entry.oldValues),
    newValues: toPrismaJson(entry.newValues),
    ipAddress: entry.ipAddress ?? metadata.ipAddress,
    userAgent: entry.userAgent ?? metadata.userAgent,
    requestId: entry.requestId ?? metadata.requestId,
    httpMethod: metadata.httpMethod,
    route: metadata.route,
    errorMessage: entry.errorMessage,
  };
}

export function mapAuditFailureEntryToCreateInput(
  entry: AuditFailureEntry,
  context: AuditContext = {},
): Prisma.AuditLogUncheckedCreateInput {
  return mapAuditEntryToCreateInput(
    {
      module: entry.module,
      entityName: entry.entityName,
      recordId: entry.recordId,
      action: entry.action,
      status: "FAILED",
      oldValues: entry.oldValues,
      newValues: entry.newValues,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      requestId: entry.requestId,
      errorMessage:
        entry.errorMessage ?? extractAuditErrorMessage(entry.error),
    },
    context,
  );
}
