import { DISPATCH_STATUSES } from "@/modules/dispatch/domain/dispatch.constants";
import { MAINTENANCE_STATUSES } from "@/modules/maintenance/domain/maintenance.constants";
import { PURCHASE_ORDER_STATUSES } from "@/modules/procurement/domain/purchase-order.constants";
import { RENTAL_ORDER_STATUSES } from "@/modules/rental-order/domain/rental-order.constants";
import { REPAIR_STATUSES } from "@/modules/repair/domain/repair.constants";
import { RETURN_STATUSES } from "@/modules/return/domain/return.constants";

/** Report filter options must match domain statuses — never invent aliases. */
export const RENTAL_REPORT_STATUS_OPTIONS = [...RENTAL_ORDER_STATUSES];
export const DISPATCH_REPORT_STATUS_OPTIONS = [...DISPATCH_STATUSES];
export const RETURN_REPORT_STATUS_OPTIONS = [...RETURN_STATUSES];
export const REPAIR_REPORT_STATUS_OPTIONS = [...REPAIR_STATUSES];
export const MAINTENANCE_REPORT_STATUS_OPTIONS = [...MAINTENANCE_STATUSES];
export const PROCUREMENT_REPORT_STATUS_OPTIONS = [...PURCHASE_ORDER_STATUSES];
