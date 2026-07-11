import { z } from "zod";

export const dateRangeFilterSchema = z
  .object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      ctx.addIssue({
        code: "custom",
        message: "Start date must be on or before end date",
        path: ["dateFrom"],
      });
    }
  });

export const balanceSheetFilterSchema = z.object({
  asOfDate: z.string().optional(),
});

export type DateRangeFilterValues = z.infer<typeof dateRangeFilterSchema>;
export type BalanceSheetFilterValues = z.infer<typeof balanceSheetFilterSchema>;
