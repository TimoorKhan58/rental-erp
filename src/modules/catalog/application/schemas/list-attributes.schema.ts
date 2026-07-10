import { ATTRIBUTE_DATA_TYPES } from "@/modules/catalog/domain";
import { z } from "zod";

import {
  BooleanStringSchema,
  PaginationSchema,
} from "@/shared/application/validation";

import { ATTRIBUTE_SORT_FIELDS } from "@/modules/catalog/domain";

export const ListAttributesSchema = PaginationSchema.extend({
  isActive: BooleanStringSchema.optional(),
  dataType: z.enum(ATTRIBUTE_DATA_TYPES).optional(),
  sortBy: z.enum(ATTRIBUTE_SORT_FIELDS).optional(),
}).superRefine((value, ctx) => {
  if (value.search !== undefined && value.search.length > 200) {
    ctx.addIssue({
      code: "custom",
      message: "Search term must not exceed 200 characters",
      path: ["search"],
    });
  }
});

export type ListAttributesInput = z.infer<typeof ListAttributesSchema>;
