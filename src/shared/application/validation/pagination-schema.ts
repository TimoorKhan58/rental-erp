import { z } from "zod";

import { SortOrderSchema, TrimmedStringSchema } from "./common-schemas";

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: TrimmedStringSchema.optional(),
  sortOrder: SortOrderSchema.default("asc"),
  search: TrimmedStringSchema.optional(),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;
