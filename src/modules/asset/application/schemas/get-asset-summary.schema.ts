import { z } from "zod";

import {
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { ASSET_STATUSES } from "@/modules/asset/domain";

export const GetAssetSummarySchema = z
  .object({
    status: z.enum(ASSET_STATUSES).optional(),
    categoryId: UUIDSchema.optional(),
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

export type GetAssetSummaryInput = z.infer<typeof GetAssetSummarySchema>;
