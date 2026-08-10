export const NOTIFICATION_EVENT_KEYS = {
  RENTAL_ORDER_CONFIRMED: "rental_order.confirmed",
  RENTAL_ORDER_CANCELLED: "rental_order.cancelled",
  DISPATCH_COMPLETED: "dispatch.completed",
  RETURN_COMPLETED: "return.completed",
  RENTAL_INVOICE_ISSUED: "rental_invoice.issued",
  PAYMENT_POSTED: "payment.posted",
  EXPENSE_APPROVED: "expense.approved",
  EXPENSE_REJECTED: "expense.rejected",
} as const;

export type NotificationEventKey =
  (typeof NOTIFICATION_EVENT_KEYS)[keyof typeof NOTIFICATION_EVENT_KEYS];
