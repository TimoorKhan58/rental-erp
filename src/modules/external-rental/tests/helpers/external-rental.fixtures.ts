import type {
  ProductId,
  RentalOrderId,
  RentalOrderItemId,
  SupplierId,
  UserId,
  WarehouseId,
  ExternalRentalAgreementId,
  ExternalRentalAgreementItemId,
} from "@/shared/domain/ids";

import type { CreateExternalRentalAgreementData } from "../../domain";
import { ExternalRentalAgreement } from "../../domain";

export const SUPPLIER_ID =
  "aa0e8400-e29b-41d4-a716-446655440011" as SupplierId;
export const WAREHOUSE_ID =
  "aa0e8400-e29b-41d4-a716-446655440012" as WarehouseId;
export const RENTAL_ORDER_ID =
  "aa0e8400-e29b-41d4-a716-446655440013" as RentalOrderId;
export const RENTAL_ORDER_ITEM_ID =
  "aa0e8400-e29b-41d4-a716-446655440014" as RentalOrderItemId;
export const PRODUCT_ID =
  "aa0e8400-e29b-41d4-a716-446655440015" as ProductId;
export const USER_ID =
  "aa0e8400-e29b-41d4-a716-446655440016" as UserId;
export const AGREEMENT_ID =
  "aa0e8400-e29b-41d4-a716-446655440017" as ExternalRentalAgreementId;
export const AGREEMENT_ITEM_ID =
  "aa0e8400-e29b-41d4-a716-446655440018" as ExternalRentalAgreementItemId;

export const VALID_CREATE_INPUT = {
  agreementNumber: "ERA-2026-001",
  supplierId: SUPPLIER_ID,
  warehouseId: WAREHOUSE_ID,
  rentalOrderId: RENTAL_ORDER_ID,
  hireStartDate: "2026-08-10T00:00:00.000Z",
  hireEndDate: "2026-08-12T00:00:00.000Z",
  expectedReturnToSupplierDate: "2026-08-13T00:00:00.000Z",
  remarks: "Hire-in chairs shortfall",
  items: [
    {
      productId: PRODUCT_ID,
      rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
      quantityRequested: 200,
      unitCost: 25,
      notes: null,
    },
  ],
};

export function buildCreateExternalRentalAgreementData(
  overrides: Partial<CreateExternalRentalAgreementData> = {},
): CreateExternalRentalAgreementData {
  return {
    agreementNumber: "ERA-2026-001",
    supplierId: SUPPLIER_ID,
    warehouseId: WAREHOUSE_ID,
    rentalOrderId: RENTAL_ORDER_ID,
    hireStartDate: new Date("2026-08-10T00:00:00.000Z"),
    hireEndDate: new Date("2026-08-12T00:00:00.000Z"),
    expectedReturnToSupplierDate: new Date("2026-08-13T00:00:00.000Z"),
    remarks: "Hire-in chairs shortfall",
    createdById: USER_ID,
    items: [
      {
        productId: PRODUCT_ID,
        rentalOrderItemId: RENTAL_ORDER_ITEM_ID,
        quantityRequested: 200,
        unitCost: 25,
        notes: null,
      },
    ],
    ...overrides,
  };
}

export function buildExternalRentalAgreementEntity(
  overrides: Partial<ReturnType<ExternalRentalAgreement["toProps"]>> = {},
): ExternalRentalAgreement {
  const created = ExternalRentalAgreement.create(
    buildCreateExternalRentalAgreementData(),
  );

  return ExternalRentalAgreement.reconstitute({
    id: AGREEMENT_ID,
    status: "DRAFT",
    settlementStatus: "UNSETTLED",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    updatedAt: new Date("2026-08-01T00:00:00.000Z"),
    ...created,
    items: created.items.map((item) => ({
      ...item,
      id: AGREEMENT_ITEM_ID,
    })),
    ...overrides,
  });
}
