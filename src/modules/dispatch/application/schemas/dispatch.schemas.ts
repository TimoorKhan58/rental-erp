import { z } from "zod";

import { DELIVERY_METHODS } from "@/modules/dispatch/domain";
import {
  DateSchema,
  NonEmptyStringSchema,
  PositiveIntSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const DeliveryMethodSchema = z.enum(DELIVERY_METHODS);

const DispatchItemInputSchema = z.object({
  productId: UUIDSchema,
  rentalOrderItemId: UUIDSchema.optional().nullable(),
  quantity: PositiveIntSchema,
  notes: TrimmedStringSchema.max(500).optional().nullable(),
});

export const DispatchIdParamSchema = z.object({
  id: UUIDSchema,
});

export const CreateDispatchSchema = z.object({
  dispatchNumber: NonEmptyStringSchema.max(50),
  rentalOrderId: UUIDSchema,
  dispatchDate: DateSchema,
  deliveryMethod: DeliveryMethodSchema,
  vehicleNumber: TrimmedStringSchema.max(50).optional().nullable(),
  driverName: TrimmedStringSchema.max(100).optional().nullable(),
  driverPhone: TrimmedStringSchema.max(30).optional().nullable(),
  deliveryAddress: NonEmptyStringSchema.max(500),
  remarks: TrimmedStringSchema.max(500).optional().nullable(),
  items: z.array(DispatchItemInputSchema).min(1),
});

export const UpdateDispatchSchema = z
  .object({
    dispatchDate: DateSchema.optional(),
    deliveryMethod: DeliveryMethodSchema.optional(),
    vehicleNumber: TrimmedStringSchema.max(50).optional().nullable(),
    driverName: TrimmedStringSchema.max(100).optional().nullable(),
    driverPhone: TrimmedStringSchema.max(30).optional().nullable(),
    deliveryAddress: NonEmptyStringSchema.max(500).optional(),
    remarks: TrimmedStringSchema.max(500).optional().nullable(),
    items: z.array(DispatchItemInputSchema).min(1).optional(),
    markReady: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.dispatchDate !== undefined ||
      value.deliveryMethod !== undefined ||
      value.vehicleNumber !== undefined ||
      value.driverName !== undefined ||
      value.driverPhone !== undefined ||
      value.deliveryAddress !== undefined ||
      value.remarks !== undefined ||
      value.items !== undefined ||
      value.markReady === true,
    { message: "At least one field must be provided for update" },
  );

export type CreateDispatchInput = z.infer<typeof CreateDispatchSchema>;
export type UpdateDispatchInput = z.infer<typeof UpdateDispatchSchema>;
export type DispatchIdParamInput = z.infer<typeof DispatchIdParamSchema>;
