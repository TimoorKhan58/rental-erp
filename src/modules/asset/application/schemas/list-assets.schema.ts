import { z } from "zod";

import {
  PaginationSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  ASSET_SORT_FIELDS,
  ASSET_STATUSES,
} from "@/modules/asset/domain";

export const ListAssetsSchema = PaginationSchema.extend({
  status: z.enum(ASSET_STATUSES).optional(),
  categoryId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  sortBy: z.enum(ASSET_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListAssetsInput = z.infer<typeof ListAssetsSchema>;
