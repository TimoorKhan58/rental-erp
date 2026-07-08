import type { Prisma } from "@/generated/prisma/client";
import type { CustomerListQuery } from "@/modules/customer/domain/customer-list.query";
import type { CustomerId } from "@/shared/domain/ids";
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

import { Customer } from "@/modules/customer/domain/customer.entity";
import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import type {
  CreateCustomerData,
  UpdateCustomerData,
} from "@/modules/customer/domain/customer.types";
import { CUSTOMER_SEARCH_FIELDS } from "@/modules/customer/domain/customer.constants";

import {
  toCustomerDomain,
  toCustomerUpdateInput,
} from "../mappers/customer.persistence.mapper";

const MODEL = "Customer";

const DEFAULT_ORDER_BY: Prisma.CustomerOrderByWithRelationInput = {
  createdAt: "desc",
};

function mapCustomerFilter(
  filter: Record<string, unknown>,
): Prisma.CustomerWhereInput | undefined {
  const where: Prisma.CustomerWhereInput = {};

  if (filter.isActive !== undefined) {
    where.isActive = Boolean(filter.isActive);
  }

  return Object.keys(where).length > 0 ? where : undefined;
}

function mapCustomerSort(
  sort: Record<string, "asc" | "desc"> | undefined,
): Prisma.CustomerOrderByWithRelationInput {
  if (sort === undefined || Object.keys(sort).length === 0) {
    return DEFAULT_ORDER_BY;
  }

  return sort as Prisma.CustomerOrderByWithRelationInput;
}

export class PrismaCustomerRepository implements ICustomerRepository {
  constructor(private readonly runner: RepositoryRunner) {}

  findById(id: CustomerId): Promise<Customer | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.customer.findUnique({
          where: { id },
        }),
      { model: MODEL, operation: "findById" },
    ).then((record) => (record ? toCustomerDomain(record) : null));
  }

  findByPhone(phone: string): Promise<Customer | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.customer.findUnique({
          where: { phone },
        }),
      { model: MODEL, operation: "findByPhone" },
    ).then((record) => (record ? toCustomerDomain(record) : null));
  }

  findByCustomerCode(customerCode: string): Promise<Customer | null> {
    return repositoryFindFirst(
      this.runner,
      (db) =>
        db.customer.findUnique({
          where: { customerCode },
        }),
      { model: MODEL, operation: "findByCustomerCode" },
    ).then((record) => (record ? toCustomerDomain(record) : null));
  }

  async findPaged(query: CustomerListQuery): Promise<PaginatedResult<Customer>> {
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
          searchFields: CUSTOMER_SEARCH_FIELDS,
        }),
        searchFields: CUSTOMER_SEARCH_FIELDS,
        mapFilter: mapCustomerFilter,
        mapSort: mapCustomerSort,
        handlers: {
          findMany: (db, args) =>
            db.customer.findMany({
              where: args.where,
              orderBy: args.orderBy,
              skip: args.skip,
              take: args.take,
            }),
          count: (db, args) =>
            db.customer.count({
              where: args.where,
            }),
        },
        meta: { model: MODEL, operation: "findPaged" },
      },
    );

    return {
      items: result.items.map(toCustomerDomain),
      meta: result.meta,
    };
  }

  async exists(id: CustomerId): Promise<boolean> {
    const record = await repositoryFindFirst(
      this.runner,
      (db) =>
        db.customer.findUnique({
          where: { id },
          select: { id: true },
        }),
      { model: MODEL, operation: "exists" },
    );

    return record !== null;
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    const normalized = Customer.create(data);

    const record = await repositoryCreate(
      this.runner,
      (db) =>
        db.customer.create({
          data: {
            customerCode: normalized.customerCode,
            name: normalized.name,
            phone: normalized.phone,
            cnic: normalized.cnic,
            address: normalized.address,
            notes: normalized.notes,
            isActive: normalized.isActive,
          },
        }),
      { model: MODEL, operation: "create" },
    );

    return toCustomerDomain(record);
  }

  async update(id: CustomerId, data: UpdateCustomerData): Promise<Customer> {
    const record = await repositoryUpdate(
      this.runner,
      (db) =>
        db.customer.update({
          where: { id },
          data: toCustomerUpdateInput(data),
        }),
      { model: MODEL, operation: "update" },
    );

    return toCustomerDomain(record);
  }

  delete(id: CustomerId): Promise<void> {
    return repositoryDelete(
      this.runner,
      (db) =>
        db.customer.delete({
          where: { id },
        }),
      { model: MODEL, operation: "delete" },
    ).then(() => undefined);
  }
}
