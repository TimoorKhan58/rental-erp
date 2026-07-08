import type { CustomerId } from "@/shared/domain/ids";

import type { Customer } from "./customer.entity";
import type { CreateCustomerData, UpdateCustomerData } from "./customer.types";

export interface ICustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
  findByPhone(phone: string): Promise<Customer | null>;
  findByCustomerCode(customerCode: string): Promise<Customer | null>;
  exists(id: CustomerId): Promise<boolean>;
  create(data: CreateCustomerData): Promise<Customer>;
  update(id: CustomerId, data: UpdateCustomerData): Promise<Customer>;
  delete(id: CustomerId): Promise<void>;
}
