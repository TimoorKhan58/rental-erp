import type { Prisma } from "@/generated/prisma/client";
import type { SupplierListQuery } from "@/modules/supplier/domain/supplier-list.query";
import type { SupplierId } from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  createRepositoryQuerySpec,
  repositoryCreate,
  repositoryDelete,
  repositoryFindFirst,
  repositoryUpdate,
  runRepositoryPagedQuery,
} from "@/shared/infrastructure/database";

import { Supplier } from "@/modules/supplier/domain/supplier.entity";
import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import type {
  CreateSupplierData,
  UpdateSupplierData,
} from "@/modules/supplier/domain/supplier.types";
import { SUPPLIER_SEARCH_FIELDS } from "@/modules/supplier/domain/supplier.constants";

import {
  toSupplierDomain,
  toSupplierUpdateInput,
} from "../mappers/supplier.persistence.mapper";

const MODEL = "Supplier";

const DEFAULT_ORDER_BY: Prisma.SupplierOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapSupplierFilter(
  filter: Record<string, unknown>,
): Prisma.SupplierWhereInput | undefined {
  const where: Prisma.SupplierWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapSupplierSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.SupplierOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.SupplierOrderByWithRelationInput;
}

export class PrismaSupplierRepository implements ISupplierRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: SupplierId): Promise<Supplier | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.supplier.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toSupplierDomain(record) : null));
  }

  findByPhone(phone: string): Promise<Supplier | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.supplier.findUnique({
          where: { phone },
        }),
      { model: MODEL, operation: "findByPhone" },
    ).then((record) => (record ? toSupplierDomain(record) : null));
  }

  findBySupplierCode(supplierCode: string): Promise<Supplier | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.supplier.findUnique({
          where: { supplierCode },
        }),
      { model: MODEL, operation: "findBySupplierCode" },
    ).then((record) => (record ? toSupplierDomain(record) : null));
  }

  async findPaged(query: SupplierListQuery): Promise<PaginatedResult<Supplier>> {
    const filter =
      query.isActive !== undefined ? { isActive: query.isActive } : undefined;

    const result = await runRepositoryPagedQuery(
      this.runner,
      {
        spec: createRepositoryQuerySpec({
          page: query.page,
          pageSize: query.pageSize,
          sortBy: query.sortBy,
          sortOrder: query.sortOrder,
          filter,
          search: query.search,
          searchFields: SUPPLIER_SEARCH_FIELDS,
        }),
        searchFields: SUPPLIER_SEARCH_FIELDS,
        mapFilter: mapSupplierFilter,
        mapSort: mapSupplierSort,
        handlers: {
          findMany: (db, args) =>
            db.supplier.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.supplier.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toSupplierDomain),
      meta: result.meta,
    };
  }

  async exists(id: SupplierId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.supplier.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateSupplierData): Promise<Supplier> {
    const normalized = Supplier.create(data);

    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.supplier.create({
          data: {
            supplierCode: normalized.supplierCode,
            name: normalized.name,
            phone: normalized.phone,
            email: normalized.email,
            address: normalized.address,
            notes: normalized.notes,
            isActive: normalized.isActive,
          },
        }),
      { model: MODEL, operation: "create" },
    );

    return toSupplierDomain(record);
  }

  async update(id: SupplierId, data: UpdateSupplierData): Promise<Supplier> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.supplier.update({
          where: { id },
          data: toSupplierUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toSupplierDomain(record);
  }

  delete(id: SupplierId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.supplier.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
