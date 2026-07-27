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
