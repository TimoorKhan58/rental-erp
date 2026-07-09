import { z } from "zod";

import {
  DateSchema,
  NonEmptyStringSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

import { RENTAL_ORDER_STATUSES } from "@/modules/rental-order/domain/rental-order.constants";

const PositiveNumberSchema = z.coerce.number().positive();

const RentalOrderItemInputSchema = z.object({
  productId: UUIDSchema,
  quantity: PositiveIntSchema,
  dailyRate: PositiveNumberSchema,
});

export const RentalOrderIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateRentalOrderSchema = z
  .object({
    orderNumber: NonEmptyStringSchema.max(50),
    customerId: UUIDSchema,
    warehouseId: UUIDSchema,
    startDate: DateSchema,
    endDate: DateSchema,
    remarks: TrimmedStringSchema.max(500).optional().nullable(),
    items: z.array(RentalOrderItemInputSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.endDate.getTime() <= value.startDate.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

export const UpdateRentalOrderSchema = z
  .object({
    customerId: UUIDSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    startDate: DateSchema.optional(),
    endDate: DateSchema.optional(),
    remarks: TrimmedStringSchema.max(500).optional().nullable(),
    items: z.array(RentalOrderItemInputSchema).min(1).optional(),
  })
  .refine(
    (value) =>
      value.customerId !== undefined ||
      value.warehouseId !== undefined ||
      value.startDate !== undefined ||
      value.endDate !== undefined ||
      value.remarks !== undefined ||
      value.items !== undefined,
    { message: "At least one field must be provided for update" },
  )
  .superRefine((value, ctx) => {
    if (
      value.startDate !== undefined &&
      value.endDate !== undefined &&
      value.endDate.getTime() <= value.startDate.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "End date must be after start date",
        path: ["endDate"],
      });
    }
  });

export const ReserveRentalOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: UUIDSchema,
        quantity: PositiveIntSchema,
      }),
    )
    .min(1),
});

export type CreateRentalOrderInput = z.infer<typeof CreateRentalOrderSchema>;
export type UpdateRentalOrderInput = z.infer<typeof UpdateRentalOrderSchema>;
export type ReserveRentalOrderInput = z.infer<typeof ReserveRentalOrderSchema>;
export type RentalOrderIdParamInput = z.infer<typeof RentalOrderIdParamSchema>;

export const RentalOrderStatusFilterSchema = z.enum(RENTAL_ORDER_STATUSES);
