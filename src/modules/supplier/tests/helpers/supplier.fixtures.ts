import { Supplier } from "@/modules/supplier/domain/supplier.entity";
import type { CreateSupplierData } from "@/modules/supplier/domain/supplier.types";
import {
  createEmail,
  createPhoneNumber,
  createSupplierCode,
} from "@/modules/supplier/domain";
import type { SupplierId } from "@/shared/domain/ids";

export const SUPPLIER_ID =
  "660e8400-e29b-41d4-a716-446655440000" as SupplierId;

export const OTHER_SUPPLIER_ID =
  "660e8400-e29b-41d4-a716-446655440001" as SupplierId;

export const VALID_CREATE_INPUT = {
  supplierCode: "SUPP-001",
  name: "Fabric Wholesale Co",
  phone: "+923001234567",
  email: "contact@fabricwholesale.com",
  address: "456 Industrial Area, Karachi",
  notes: "Preferred supplier",
  isActive: true,
};

export function buildCreateSupplierData(
  override: Partial<CreateSupplierData> = {},
): CreateSupplierData {
  return {
    supplierCode: createSupplierCode(VALID_CREATE_INPUT.supplierCode),
    name: VALID_CREATE_INPUT.name,
    phone: createPhoneNumber(VALID_CREATE_INPUT.phone),
    email: createEmail(VALID_CREATE_INPUT.email),
    address: VALID_CREATE_INPUT.address,
    notes: VALID_CREATE_INPUT.notes,
    isActive: VALID_CREATE_INPUT.isActive,
    ...override,
  };
}

export function buildSupplierEntity(
  override: Partial<ReturnType<typeof Supplier.create>> & {
    id?: SupplierId;
    createdAt?: Date;
    updatedAt?: Date;
  } = {},
): Supplier {
  const created = Supplier.create(buildCreateSupplierData());
  const now = new Date("2026-01-15T10:00:00.000Z");

  return Supplier.reconstitute({
    id: override.id ?? SUPPLIER_ID,
    supplierCode: override.supplierCode ?? created.supplierCode,
    name: override.name ?? created.name,
    phone: override.phone ?? created.phone,
    email: override.email ?? created.email,
    address: override.address ?? created.address,
    notes: override.notes ?? created.notes,
    isActive: override.isActive ?? created.isActive,
    createdAt: override.createdAt ?? now,
    updatedAt: override.updatedAt ?? now,
  });
}
