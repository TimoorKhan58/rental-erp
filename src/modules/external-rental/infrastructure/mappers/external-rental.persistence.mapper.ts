import { Prisma } from "@/generated/prisma/client";
import { ExternalRentalAgreement } from "@/modules/external-rental/domain";
import type {
  CreateExternalRentalAgreementData,
  ExternalRentalAgreementStatus,
  ExternalRentalSettlementStatus,
  UpdateExternalRentalWorkflowData,
} from "@/modules/external-rental/domain";
import type {
  ExternalRentalAgreementId,
  ExternalRentalAgreementItemId,
  ProductId,
  RentalOrderId,
  RentalOrderItemId,
  SupplierId,
  UserId,
  WarehouseId,
} from "@/shared/domain/ids";

function decimalToNumber(value: Prisma.Decimal): number {
  return value.toNumber();
}

function toPrismaDecimal(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

type ExternalRentalAgreementRecord = {
  id: string;
  agreementNumber: string;
  supplierId: string;
  warehouseId: string;
  rentalOrderId: string;
  status: ExternalRentalAgreementStatus;
  settlementStatus: ExternalRentalSettlementStatus;
  hireStartDate: Date;
  hireEndDate: Date;
  expectedReturnToSupplierDate: Date;
  totalHireInCost: Prisma.Decimal;
  amountDue: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  remarks: string | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    productId: string;
    rentalOrderItemId: string;
    quantityRequested: number;
    quantityConfirmed: number;
    quantityReceived: number;
    quantityAllocated: number;
    quantityDispatched: number;
    quantityReturnedFromCustomer: number;
    quantityReturnedToSupplier: number;
    quantityWrittenOff: number;
    unitCost: Prisma.Decimal;
    lineHireInCost: Prisma.Decimal;
    notes: string | null;
  }>;
};

export function toExternalRentalAgreementDomain(
  record: ExternalRentalAgreementRecord,
): ExternalRentalAgreement {
  return ExternalRentalAgreement.reconstitute({
    id: record.id as ExternalRentalAgreementId,
    agreementNumber: record.agreementNumber,
    supplierId: record.supplierId as SupplierId,
    warehouseId: record.warehouseId as WarehouseId,
    rentalOrderId: record.rentalOrderId as RentalOrderId,
    status: record.status,
    settlementStatus: record.settlementStatus,
    hireStartDate: record.hireStartDate,
    hireEndDate: record.hireEndDate,
    expectedReturnToSupplierDate: record.expectedReturnToSupplierDate,
    totalHireInCost: decimalToNumber(record.totalHireInCost),
    amountDue: decimalToNumber(record.amountDue),
    amountPaid: decimalToNumber(record.amountPaid),
    remarks: record.remarks,
    createdById: record.createdById as UserId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    items: record.items.map((item) => ({
      id: item.id as ExternalRentalAgreementItemId,
      productId: item.productId as ProductId,
      rentalOrderItemId: item.rentalOrderItemId as RentalOrderItemId,
      quantityRequested: item.quantityRequested,
      quantityConfirmed: item.quantityConfirmed,
      quantityReceived: item.quantityReceived,
      quantityAllocated: item.quantityAllocated,
      quantityDispatched: item.quantityDispatched,
      quantityReturnedFromCustomer: item.quantityReturnedFromCustomer,
      quantityReturnedToSupplier: item.quantityReturnedToSupplier,
      quantityWrittenOff: item.quantityWrittenOff,
      unitCost: decimalToNumber(item.unitCost),
      lineHireInCost: decimalToNumber(item.lineHireInCost),
      notes: item.notes,
    })),
  });
}

export function toExternalRentalAgreementCreateInput(
  data: CreateExternalRentalAgreementData,
): Prisma.ExternalRentalAgreementCreateInput {
  const normalized = ExternalRentalAgreement.create(data);

  return {
    agreementNumber: normalized.agreementNumber,
    supplier: { connect: { id: normalized.supplierId } },
    warehouse: { connect: { id: normalized.warehouseId } },
    rentalOrder: { connect: { id: normalized.rentalOrderId } },
    status: "DRAFT",
    settlementStatus: "UNSETTLED",
    hireStartDate: normalized.hireStartDate,
    hireEndDate: normalized.hireEndDate,
    expectedReturnToSupplierDate: normalized.expectedReturnToSupplierDate,
    totalHireInCost: toPrismaDecimal(normalized.totalHireInCost),
    amountDue: toPrismaDecimal(normalized.amountDue),
    amountPaid: toPrismaDecimal(normalized.amountPaid),
    remarks: normalized.remarks,
    createdBy: { connect: { id: normalized.createdById } },
    items: {
      create: normalized.items.map((item) => ({
        product: { connect: { id: item.productId } },
        rentalOrderItem: { connect: { id: item.rentalOrderItemId } },
        quantityRequested: item.quantityRequested,
        quantityConfirmed: item.quantityConfirmed,
        quantityReceived: item.quantityReceived,
        quantityAllocated: item.quantityAllocated,
        quantityDispatched: item.quantityDispatched,
        quantityReturnedFromCustomer: item.quantityReturnedFromCustomer,
        quantityReturnedToSupplier: item.quantityReturnedToSupplier,
        quantityWrittenOff: item.quantityWrittenOff,
        unitCost: toPrismaDecimal(item.unitCost),
        lineHireInCost: toPrismaDecimal(item.lineHireInCost),
        notes: item.notes,
      })),
    },
  };
}

export const EXTERNAL_RENTAL_AGREEMENT_INCLUDE = {
  items: true,
} as const;

export function toExternalRentalWorkflowUpdateInput(
  data: UpdateExternalRentalWorkflowData,
): Prisma.ExternalRentalAgreementUpdateInput {
  return {
    status: data.status,
    settlementStatus: data.settlementStatus,
    totalHireInCost: toPrismaDecimal(data.totalHireInCost),
    amountDue: toPrismaDecimal(data.amountDue),
    amountPaid: toPrismaDecimal(data.amountPaid),
    items: {
      update: data.items.map((item) => ({
        where: { id: item.id },
        data: {
          quantityConfirmed: item.quantityConfirmed,
          quantityReceived: item.quantityReceived,
          quantityAllocated: item.quantityAllocated,
          quantityDispatched: item.quantityDispatched,
          quantityReturnedFromCustomer: item.quantityReturnedFromCustomer,
          quantityReturnedToSupplier: item.quantityReturnedToSupplier,
          quantityWrittenOff: item.quantityWrittenOff,
          lineHireInCost: toPrismaDecimal(item.lineHireInCost),
        },
      })),
    },
  };
}
