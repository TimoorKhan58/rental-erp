import type { SupplierId } from "@/shared/domain/ids";
import type { Entity } from "@/shared/domain/base-entity";

import { SupplierInvariantError } from "./supplier.errors";
import type { CreateSupplierData } from "./supplier.types";
import type { Email } from "./value-objects/email.vo";
import type { PhoneNumber } from "./value-objects/phone.vo";
import type { SupplierCode } from "./value-objects/supplier-code.vo";
import { createEmail } from "./value-objects/email.vo";
import { createPhoneNumber } from "./value-objects/phone.vo";
import { createSupplierCode } from "./value-objects/supplier-code.vo";

export interface SupplierProps {
  id: SupplierId;
  supplierCode: SupplierCode;
  name: string;
  phone: PhoneNumber;
  email: Email | null;
  address: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class Supplier implements Entity<SupplierId> {
  readonly id: SupplierId;
  readonly supplierCode: SupplierCode;
  readonly name: string;
  readonly phone: PhoneNumber;
  readonly email: Email | null;
  readonly address: string;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: SupplierProps) {
    this.id = props.id;
    this.supplierCode = props.supplierCode;
    this.name = props.name;
    this.phone = props.phone;
    this.email = props.email;
    this.address = props.address;
    this.notes = props.notes;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(
    data: CreateSupplierData,
  ): Omit<SupplierProps, "id" | "createdAt" | "updatedAt"> {
    return {
      supplierCode: data.supplierCode,
      name: normalizeRequiredText(data.name, "name"),
      phone: data.phone,
      email: data.email ?? null,
      address: normalizeRequiredText(data.address, "address"),
      notes: normalizeOptionalText(data.notes),
      isActive: data.isActive ?? true,
    };
  }

  static reconstitute(props: SupplierProps): Supplier {
    return new Supplier({
      id: props.id,
      supplierCode: createSupplierCode(props.supplierCode),
      name: normalizeRequiredText(props.name, "name"),
      phone: createPhoneNumber(props.phone),
      email: createEmail(props.email),
      address: normalizeRequiredText(props.address, "address"),
      notes: normalizeOptionalText(props.notes),
      isActive: props.isActive,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
  }

  toProps(): SupplierProps {
    return {
      id: this.id,
      supplierCode: this.supplierCode,
      name: this.name,
      phone: this.phone,
      email: this.email,
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
    throw new SupplierInvariantError(`${field} is required`, field);
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
