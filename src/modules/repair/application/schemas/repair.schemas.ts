import { z } from "zod";

import {
  DateSchema,
  PaginationSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import {
  REPAIR_SORT_FIELDS,
  REPAIR_STATUSES,
} from "@/modules/repair/domain";

export const RepairIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateRepairSchema = z.object({
  repairNumber: TrimmedStringSchema.max(50).optional(),
  returnId: UUIDSchema,
  returnItemId: UUIDSchema,
  productId: UUIDSchema,
  warehouseId: UUIDSchema,
  quantity: PositiveIntSchema,
  repairCost: z.coerce.number().min(0),
  repairNotes: TrimmedStringSchema.max(500).optional().nullable(),
  technician: TrimmedStringSchema.max(100).optional().nullable(),
  repairDate: DateSchema,
});

export const UpdateRepairSchema = z
  .object({
    repairCost: z.coerce.number().min(0).optional(),
    repairNotes: TrimmedStringSchema.max(500).optional().nullable(),
    technician: TrimmedStringSchema.max(100).optional().nullable(),
    repairDate: DateSchema.optional(),
    quantity: PositiveIntSchema.optional(),
  })
  .refine(
    (value) =>
      value.repairCost !== undefined ||
      value.repairNotes !== undefined ||
      value.technician !== undefined ||
      value.repairDate !== undefined ||
      value.quantity !== undefined,
    { message: "At least one field must be provided for update" },
  );

export const ListRepairsSchema = PaginationSchema.extend({
  status: z.enum(REPAIR_STATUSES).optional(),
  returnId: UUIDSchema.optional(),
  productId: UUIDSchema.optional(),
  warehouseId: UUIDSchema.optional(),
  repairDateFrom: DateSchema.optional(),
  repairDateTo: DateSchema.optional(),
  technician: TrimmedStringSchema.max(100).optional(),
  sortBy: z.enum(REPAIR_SORT_FIELDS).optional(),
})
  .superRefine((value, ctx) => {
    if (value.search !== undefined && value.search.length > 200) {
      ctx.addIssue({
        code: "custom",
        message: "Search term must not exceed 200 characters",
        path: ["search"],
      });
    }
  })
  .superRefine((value, ctx) => {
    if (
      value.repairDateFrom !== undefined &&
      value.repairDateTo !== undefined &&
      value.repairDateFrom > value.repairDateTo
    ) {
      ctx.addIssue({
        code: "custom",
        message: "repairDateFrom must be on or before repairDateTo",
        path: ["repairDateTo"],
      });
    }
  });

export type CreateRepairInput = z.infer<typeof CreateRepairSchema>;
export type UpdateRepairInput = z.infer<typeof UpdateRepairSchema>;
export type RepairIdParamInput = z.infer<typeof RepairIdParamSchema>;
export type ListRepairsInput = z.infer<typeof ListRepairsSchema>;
