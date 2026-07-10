import type { Prisma } from "@/generated/prisma/client";
import type { AuditListQuery } from "@/modules/audit/domain/audit-list.query";
import type { AuditLogId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryFindFirst,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { AuditLog } from "@/modules/audit/domain/audit-log.entity";
import type { IAuditLogRepository } from "@/modules/audit/domain/audit-log.repository.interface";
import { AUDIT_SEARCH_FIELDS } from "@/modules/audit/domain/audit-log.constants";

import { toAuditLogDomain } from "../mappers/audit-log.persistence.mapper";

const MODEL = "AuditLog";

const DEFAULT_ORDER_BY: Prisma.AuditLogOrderByWithRelationInput = {
  createdAt: "desc",
};

function buildCreatedAtFilter(
  fromDate?: Date,
  toDate?: Date,
): Prisma.DateTimeFilter | undefined {
  if (fromDate === undefined && toDate === undefined) {
    return undefined;
  }

  const filter: Prisma.DateTimeFilter = {};

  if (fromDate !== undefined) {
    filter.gte = fromDate;
  }

  if (toDate !== undefined) {
    filter.lte = toDate;
  }

  return filter;
}

function mapAuditFilter(
  filter: Record<string, unknown>,
): Prisma.AuditLogWhereInput | undefined {
  const where: Prisma.AuditLogWhereInput = {};

  if (filter.entityType !== undefined) {
    where.entityName = String(filter.entityType);
  }

  if (filter.entityId !== undefined) {
    where.recordId = String(filter.entityId);
  }

  if (filter.userId !== undefined) {
    where.userId = String(filter.userId);
  }

  if (filter.action !== undefined) {
    where.action = filter.action as AuditLog["action"];
  }

  const createdAt = buildCreatedAtFilter(
    filter.fromDate as Date | undefined,
    filter.toDate as Date | undefined,
  );

  if (createdAt !== undefined) {
    where.createdAt = createdAt;
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapAuditSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.AuditLogOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.AuditLogOrderByWithRelationInput;
}

export class PrismaAuditLogRepository implements IAuditLogRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: AuditLogId): Promise<AuditLog | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.auditLog.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toAuditLogDomain(record) : null));
  }

  async findPaged(query: AuditListQuery): Promise<PaginatedResult<AuditLog>> {
    const filter: Record<string, unknown> = {};

    if (query.entityType !== undefined) {
      filter.entityType = query.entityType;
    }

    if (query.entityId !== undefined) {
      filter.entityId = query.entityId;
    }

    if (query.userId !== undefined) {
      filter.userId = query.userId;
    }

    if (query.action !== undefined) {
      filter.action = query.action;
    }

    if (query.fromDate !== undefined) {
      filter.fromDate = query.fromDate;
    }

    if (query.toDate !== undefined) {
      filter.toDate = query.toDate;
    }

    const result = await runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          search: query.search,
          searchFields: AUDIT_SEARCH_FIELDS,
        }),
        searchFields: AUDIT_SEARCH_FIELDS,
        mapFilter: mapAuditFilter,
        mapSort: mapAuditSort,
        handlers: {
          findMany: (db, args) =>
            db.auditLog.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.auditLog.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toAuditLogDomain),
      meta: result.meta,
    };
  }
}
