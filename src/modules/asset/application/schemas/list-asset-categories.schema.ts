import { z } from "zod";

import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";

import { ASSET_CATEGORY_SORT_FIELDS } from "@/modules/asset/domain";

export const ListAssetCategoriesSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(ASSET_CATEGORY_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListAssetCategoriesInput = z.infer<typeof ListAssetCategoriesSchema>;
