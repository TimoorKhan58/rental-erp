import type {
  ExternalRentalAgreementId,
  RentalOrderId,
} from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { ExternalRentalAgreement } from "@/modules/external-rental/domain";
import type { IExternalRentalRepository } from "@/modules/external-rental/domain";
import type { ExternalRentalListQuery } from "@/modules/external-rental/domain";
import type {
  CreateExternalRentalAgreementData,
  UpdateExternalRentalWorkflowData,
} from "@/modules/external-rental/domain";
import { EXTERNAL_RENTAL_SEARCH_FIELDS } from "@/modules/external-rental/domain";

import {
  EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
  toExternalRentalAgreementCreateInput,
  toExternalRentalAgreementDomain,
  toExternalRentalWorkflowUpdateInput,
} from "../mappers/external-rental.persistence.mapper";

const MODEL = "ExternalRentalAgreement";

const DEFAULT_ORDER_BY = {
  createdAt: "desc" as const,
};

function mapExternalRentalFilter(
  filter: Record<string, unknown>,
):
  | import("@/generated/prisma/client").Prisma.ExternalRentalAgreementWhereInput
  | undefined {
  const where: import("@/generated/prisma/client").Prisma.ExternalRentalAgreementWhereInput =
    {};

  if (filter.status !== undefined) {
    where.status = filter.status as ExternalRentalAgreement["status"];
  }

  if (filter.settlementStatus !== undefined) {
    where.settlementStatus =
      filter.settlementStatus as ExternalRentalAgreement["settlementStatus"];
  }

  if (filter.supplierId !== undefined) {
    where.supplierId = String(filter.supplierId);
  }

  if (filter.warehouseId !== undefined) {
    where.warehouseId = String(filter.warehouseId);
  }

  if (filter.rentalOrderId !== undefined) {
    where.rentalOrderId = String(filter.rentalOrderId);
  }

  if (
    filter.hireStartFrom !== undefined ||
    filter.hireStartTo !== undefined
  ) {
    where.hireStartDate = {};

    if (filter.hireStartFrom !== undefined) {
      where.hireStartDate.gte = filter.hireStartFrom as Date;
    }

    if (filter.hireStartTo !== undefined) {
      where.hireStartDate.lte = filter.hireStartTo as Date;
    }
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapExternalRentalSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): import("@/generated/prisma/client").Prisma.ExternalRentalAgreementOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as import("@/generated/prisma/client").Prisma.ExternalRentalAgreementOrderByWithRelationInput;
}

export class PrismaExternalRentalRepository
  implements IExternalRentalRepository
{
  constructor(private readonly runner: RepositoryRunner) {}

  findById(
    id: ExternalRentalAgreementId,
  ): Promise<ExternalRentalAgreement | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.externalRentalAgreement.findUnique({
          where: { id },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) =>
      record ? toExternalRentalAgreementDomain(record) : null,
    );
  }

  findByAgreementNumber(
    agreementNumber: string,
  ): Promise<ExternalRentalAgreement | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.externalRentalAgreement.findUnique({
          where: { agreementNumber },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "findByAgreementNumber" },
    ).then((record) =>
      record ? toExternalRentalAgreementDomain(record) : null,
    );
  }

  findActiveByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<ExternalRentalAgreement | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.externalRentalAgreement.findFirst({
          where: {
            rentalOrderId,
            status: { not: "CANCELLED" },
          },
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "findActiveByRentalOrderId" },
    ).then((record) =>
      record ? toExternalRentalAgreementDomain(record) : null,
    );
  }

  findPaged(
    query: ExternalRentalListQuery,
  ): Promise<PaginatedResult<ExternalRentalAgreement>> {
    const filter: Record<string, unknown> = {};

    if (query.status !== undefined) {
      filter.status = query.status;
    }

    if (query.settlementStatus !== undefined) {
      filter.settlementStatus = query.settlementStatus;
    }

    if (query.supplierId !== undefined) {
      filter.supplierId = query.supplierId;
    }

    if (query.warehouseId !== undefined) {
      filter.warehouseId = query.warehouseId;
    }

    if (query.rentalOrderId !== undefined) {
      filter.rentalOrderId = query.rentalOrderId;
    }

    if (query.hireStartFrom !== undefined) {
      filter.hireStartFrom = query.hireStartFrom;
    }

    if (query.hireStartTo !== undefined) {
      filter.hireStartTo = query.hireStartTo;
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
          searchFields: EXTERNAL_RENTAL_SEARCH_FIELDS,
        }),
        searchFields: EXTERNAL_RENTAL_SEARCH_FIELDS,
        mapFilter: mapExternalRentalFilter,
        mapSort: mapExternalRentalSort,
        handlers: {
          findMany: (db, args) =>
            db.externalRentalAgreement.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
              include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
            }),
          count: (db, args) =>
            db.externalRentalAgreement.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    ).then((result) => ({
      items: result.items.map(toExternalRentalAgreementDomain),
      meta: result.meta,
    }));
  }

  create(
    data: CreateExternalRentalAgreementData,
  ): Promise<ExternalRentalAgreement> {
    return repositoryCreate(
      this.runner,
      (db) =>
        db.externalRentalAgreement.create({
          data: toExternalRentalAgreementCreateInput(data),
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "create" },
    ).then((record) => toExternalRentalAgreementDomain(record));
  }

  updateWorkflow(
    id: ExternalRentalAgreementId,
    data: UpdateExternalRentalWorkflowData,
  ): Promise<ExternalRentalAgreement> {
    return repositoryUpdate(
      this.runner,
      (db) =>
        db.externalRentalAgreement.update({
          where: { id },
          data: toExternalRentalWorkflowUpdateInput(data),
          include: EXTERNAL_RENTAL_AGREEMENT_INCLUDE,
        }),
      { model: MODEL, operation: "updateWorkflow" },
    ).then((record) => toExternalRentalAgreementDomain(record));
  }
}
