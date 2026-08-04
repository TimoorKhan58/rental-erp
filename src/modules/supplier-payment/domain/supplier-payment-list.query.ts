import type {
  PurchaseOrderId,
  SupplierId,
} from "@/shared/domain/ids";

import type {
  PaymentStatus,
  SupplierPaymentSortField,
} from "./supplier-payment.constants";

export interface SupplierPaymentListQuery {
  page: number;
  pageSize: number;
  sortBy?: SupplierPaymentSortField;
  sortOrder?: "asc" | "desc";
  search?: string;
  status?: PaymentStatus;
  supplierId?: SupplierId;
  purchaseOrderId?: PurchaseOrderId;
}
