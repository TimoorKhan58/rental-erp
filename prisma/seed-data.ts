import { USER_ROLES } from "../src/constants/roles";
import { DEFAULT_EXPENSE_CATEGORIES } from "../src/modules/expense/domain/default-expense-categories";

export const SEED_ROLES = [
  { id: "00000000-0000-4000-8000-000000000001", name: USER_ROLES.OWNER },
  { id: "00000000-0000-4000-8000-000000000002", name: USER_ROLES.MANAGER },
  { id: "00000000-0000-4000-8000-000000000003", name: USER_ROLES.WORKER },
  { id: "00000000-0000-4000-8000-000000000004", name: USER_ROLES.ACCOUNTANT },
  { id: "00000000-0000-4000-8000-000000000005", name: USER_ROLES.VIEWER },
] as const;

export const SEED_UNITS_OF_MEASURE = [
  {
    id: "00000000-0000-4000-8000-000000000301",
    code: "PCS",
    name: "Pieces",
    description: "Individual items",
  },
  {
    id: "00000000-0000-4000-8000-000000000302",
    code: "SET",
    name: "Set",
    description: "Grouped item set",
  },
  {
    id: "00000000-0000-4000-8000-000000000303",
    code: "DAY",
    name: "Day",
    description: "Rental day unit",
  },
] as const;

export const SEED_EXPENSE_CATEGORIES = DEFAULT_EXPENSE_CATEGORIES;

export const SEED_NOTIFICATION_TEMPLATES = [
  {
    id: "00000000-0000-4000-8000-000000000401",
    name: "Rental order confirmed",
    eventKey: "rental_order.confirmed",
    channel: "IN_APP" as const,
    title: "Rental order confirmed",
    body: "A rental order was confirmed and is ready for dispatch.",
  },
  {
    id: "00000000-0000-4000-8000-000000000402",
    name: "Rental order cancelled",
    eventKey: "rental_order.cancelled",
    channel: "IN_APP" as const,
    title: "Rental order cancelled",
    body: "A rental order was cancelled.",
  },
  {
    id: "00000000-0000-4000-8000-000000000403",
    name: "Dispatch completed",
    eventKey: "dispatch.completed",
    channel: "IN_APP" as const,
    title: "Dispatch completed",
    body: "A dispatch was completed and stock has left the warehouse.",
  },
  {
    id: "00000000-0000-4000-8000-000000000404",
    name: "Return completed",
    eventKey: "return.completed",
    channel: "IN_APP" as const,
    title: "Return completed",
    body: "A return was completed and stock has been processed.",
  },
  {
    id: "00000000-0000-4000-8000-000000000405",
    name: "Rental invoice issued",
    eventKey: "rental_invoice.issued",
    channel: "IN_APP" as const,
    title: "Invoice issued",
    body: "A rental invoice was issued and is ready for payment.",
  },
  {
    id: "00000000-0000-4000-8000-000000000406",
    name: "Payment posted",
    eventKey: "payment.posted",
    channel: "IN_APP" as const,
    title: "Payment posted",
    body: "A customer payment was posted to an invoice.",
  },
  {
    id: "00000000-0000-4000-8000-000000000407",
    name: "Expense approved",
    eventKey: "expense.approved",
    channel: "IN_APP" as const,
    title: "Expense approved",
    body: "An expense claim was approved.",
  },
  {
    id: "00000000-0000-4000-8000-000000000408",
    name: "Expense rejected",
    eventKey: "expense.rejected",
    channel: "IN_APP" as const,
    title: "Expense rejected",
    body: "An expense claim was rejected.",
  },
] as const;
