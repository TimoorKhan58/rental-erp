import type { JournalEntryListQuery } from "@/modules/accounting/domain/journal-entry-list.query";
import type { JournalEntryId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { JournalEntry } from "@/modules/accounting/domain/journal-entry.entity";
import type { IJournalEntryRepository } from "@/modules/accounting/domain/journal-entry.repository.interface";
import type {
  CreateJournalEntryData,
  UpdateJournalEntryData,
  UpdateJournalEntryStatusData,
} from "@/modules/accounting/domain/journal-entry.types";
import { JOURNAL_ENTRY_SEARCH_FIELDS } from "@/modules/accounting/domain/journal-entry.constants";

import {
  JOURNAL_ENTRY_INCLUDE,
  toJournalEntryCreateInput,
  toJournalEntryDomain,
  toJournalEntryStatusUpdateInput,
  toJournalEntryUpdateInput,
} from "../mappers/journal-entry.persistence.mapper";

const MODEL = "JournalEntry";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapJournalEntryFilter(
  filter: Record<string, unknown>,
): import("@/generated/prisma/client").Prisma.JournalEntryWhereInput | undefined {
  const where: import("@/generated/prisma/client").Prisma.JournalEntryWhereInput =
    {};

  if (filter.status !== undefined) {
    where.status = filter.status as JournalEntry["status"];
  }

  if (filter.referenceType !== undefined) {
    where.referenceType = filter.referenceType as JournalEntry["referenceType"];
  }

  if (filter.journalDateFrom !== undefined || filter.journalDateTo !== undefined) {
    where.journalDate = {};

    if (filter.journalDateFrom !== undefined) {
      where.journalDate.gte = filter.journalDateFrom as Date;
    }

    if (filter.journalDateTo !== undefined) {
      where.journalDate.lte = filter.journalDateTo as Date;
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapJournalEntrySort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.JournalEntryOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.JournalEntryOrderByWithRelationInput;
}

export class PrismaJournalEntryRepository implements IJournalEntryRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: JournalEntryId): Promise<JournalEntry | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.journalEntry.findUnique({
          where: { id },
          include: JOURNAL_ENTRY_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toJournalEntryDomain(record) : null));
  }

  findByJournalNumber(journalNumber: string): Promise<JournalEntry | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.journalEntry.findUnique({
          where: { journalNumber },
          include: JOURNAL_ENTRY_INCLUDE,
        }),
      { model: MODEL, operation: "findByJournalNumber" },
    ).then((record) => (record ? toJournalEntryDomain(record) : null));
  }

  findPaged(
    query: JournalEntryListQuery,
  ): Promise<PaginatedResult<JournalEntry>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.referenceType !== undefined) {
      filter.referenceType = query.referenceType;
    }

    if (query.journalDateFrom !== undefined) {
      filter.journalDateFrom = query.journalDateFrom;
    }

    if (query.journalDateTo !== undefined) {
      filter.journalDateTo = query.journalDateTo;
    }

    return runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter: Object.keys(filter).length > 0 ? filter : undefined,
          search: query.search,
          searchFields: JOURNAL_ENTRY_SEARCH_FIELDS,
        }),
        searchFields: JOURNAL_ENTRY_SEARCH_FIELDS,
        mapFilter: mapJournalEntryFilter,
        mapSort: mapJournalEntrySort,
        handlers: {
          findMany: (db, args) =>
            db.journalEntry.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: JOURNAL_ENTRY_INCLUDE,
            }),
          count: (db, args) =>
            db.journalEntry.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toJournalEntryDomain),
      meta: result.meta,
    }));
  }

  create(data: CreateJournalEntryData): Promise<JournalEntry> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.journalEntry.create({
          data: toJournalEntryCreateInput(data),
          include: JOURNAL_ENTRY_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then(toJournalEntryDomain);
  }

  async update(
    id: JournalEntryId,
    data: UpdateJournalEntryData,
  ): Promise<JournalEntry> {
    const existing = await this.findById(id);

    if (existing === null) {
      throw new Error(`Journal entry not found: ${id}`);
    }

    return repositoryUpdate(
      this.runner,
      (db) =>
        db.journalEntry.update({
          where: { id },
          data: toJournalEntryUpdateInput(data, existing),
          include: JOURNAL_ENTRY_INCLUDE,
        }),
      { model: MODEL, operation: "update" },
    ).then(toJournalEntryDomain);
  }

  updateStatus(
    id: JournalEntryId,
    data: UpdateJournalEntryStatusData,
  ): Promise<JournalEntry> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.journalEntry.update({
          where: { id },
          data: toJournalEntryStatusUpdateInput(data),
          include: JOURNAL_ENTRY_INCLUDE,
        }),
      { model: MODEL, operation: "updateStatus" },
    ).then(toJournalEntryDomain);
  }
}
