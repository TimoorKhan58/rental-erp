/**
 * Default expense categories for first-run seeding and fresh environments.
 * Deterministic UUIDs keep seeds reproducible across deployments.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  {
    id: "ec000001-0000-4000-8000-000000000001",
    name: "Fuel",
    description: "Fuel and energy costs",
  },
  {
    id: "ec000001-0000-4000-8000-000000000002",
    name: "Labour",
    description: "Labour and wages",
  },
  {
    id: "ec000001-0000-4000-8000-000000000003",
    name: "Vehicle Maintenance",
    description: "Vehicle servicing and maintenance",
  },
  {
    id: "ec000001-0000-4000-8000-000000000004",
    name: "Repair",
    description: "Equipment repair costs",
  },
  {
    id: "ec000001-0000-4000-8000-000000000005",
    name: "Office",
    description: "Office supplies and administration",
  },
  {
    id: "ec000001-0000-4000-8000-000000000006",
    name: "Purchase",
    description: "General purchases",
  },
  {
    id: "ec000001-0000-4000-8000-000000000007",
    name: "Utility",
    description: "Utilities and services",
  },
  {
    id: "ec000001-0000-4000-8000-000000000008",
    name: "Transport",
    description: "Transport and logistics",
  },
  {
    id: "ec000001-0000-4000-8000-000000000009",
    name: "Miscellaneous",
    description: "Other operational expenses",
  },
] as const;
