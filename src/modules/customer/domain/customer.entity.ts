import type { CustomerId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import { CustomerInvariantError } from "./customer.errors";
import type { CreateCustomerData } from "./customer.types";
import type { CustomerCode } from "./value-objects/customer-code.vo";
import type { Cnic } from "./value-objects/cnic.vo";
import type { PhoneNumber } from "./value-objects/phone.vo";
import { createCnic } from "./value-objects/cnic.vo";
import { createCustomerCode } from "./value-objects/customer-code.vo";
import { createPhoneNumber } from "./value-objects/phone.vo";

export interface CustomerProps {
  id: CustomerId;
  customerCode: CustomerCode;
  name: string;
  phone: PhoneNumber;
  cnic: Cnic | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Customer implements Entity<CustomerId> {
  readonly id: CustomerId;
  readonly customerCode: CustomerCode;
  readonly name: string;
  readonly phone: PhoneNumber;
  readonly cnic: Cnic | null;
  readonly address: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CustomerProps) {
    this.id = props.id;
    this.customerCode = props.customerCode;
    this.name = props.name;
    this.phone = props.phone;
    this.cnic = props.cnic;
    this.address = props.address;
    this.notes = props.notes;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(data: CreateCustomerData): Omit<CustomerProps, "id" | "createdAt" | "updatedAt"> {
    return {
      customerCode: data.customerCode,
      name: normalizeRequiredText(data.name, "name"),
      phone: data.phone,
      cnic: data.cnic ?? null,
      address: normalizeRequiredText(data.address, "address"),
      notes: normalizeOptionalText(data.notes),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: CustomerProps): Customer {
    return new Customer({
      id: props.id,
      customerCode: createCustomerCode(props.customerCode),
      name: normalizeRequiredText(props.name, "name"),
      phone: createPhoneNumber(props.phone),
      cnic: createCnic(props.cnic),
      address: normalizeRequiredText(props.address, "address"),
      notes: normalizeOptionalText(props.notes),
      isActive: props.isActive,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  toProps(): CustomerProps {
    return {
      id: this.id,
      customerCode: this.customerCode,
      name: this.name,
      phone: this.phone,
      cnic: this.cnic,
      address: this.address,
      notes: this.notes,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

function normalizeRequiredText(value: string, field: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new CustomerInvariantError(`${field} is required`, field);
  }

  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
