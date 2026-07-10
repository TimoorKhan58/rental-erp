import { z } from "zod";

import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";

import { BRAND_SORT_FIELDS } from "@/modules/catalog/domain";

export const ListBrandsSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  sortBy: z.enum(BRAND_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListBrandsInput = z.infer<typeof ListBrandsSchema>;
