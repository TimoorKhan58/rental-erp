/** Standard account codes seeded in `prisma/seed-data.ts`. */
export const DEFAULT_ACCOUNT_CODES = {
  CASH: "1000",
  ACCOUNTS_RECEIVABLE: "1100",
  RENTAL_REVENUE: "4000",
  GENERAL_EXPENSE: "5000",
} as const;

export type DefaultAccountCodeKey = keyof typeof DEFAULT_ACCOUNT_CODES;
