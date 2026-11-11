import {
  BooleanStringSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import { z } from "zod";

export const GetInventorySummarySchema = z
  .object({
    isActive: BooleanStringSchema.optional(),
    productId: UUIDSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    search: TrimmedStringSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.search !== undefined && value.search.length > 200) {
      ctx.addIssue({
        code: "custom",
        message: "Search term must not exceed 200 characters",
        path: ["search"],
      });
    }
  });

export type GetInventorySummaryInput = z.infer<typeof GetInventorySummarySchema>;
