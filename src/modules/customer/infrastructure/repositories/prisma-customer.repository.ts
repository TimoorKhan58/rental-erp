import type { CustomerId } from "@/shared/domain/ids";
import type { RepositoryRunner } from "@/shared/infrastructure/database";
import {
  repositoryCreate,
  repositoryDelete,
  repositoryFindFirst,
  repositoryUpdate,
} from "@/shared/infrastructure/database";

import { Customer } from "@/modules/customer/domain/customer.entity";
import type { ICustomerRepository } from "@/modules/customer/domain/customer.repository.interface";
import type {
  CreateCustomerData,
  UpdateCustomerData,
} from "@/modules/customer/domain/customer.types";

import {
  toCustomerDomain,
  toCustomerUpdateInput,
} from "../mappers/customer.persistence.mapper";

const MODEL = "Customer";

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
