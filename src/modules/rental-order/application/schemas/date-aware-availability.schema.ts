import { DateSchema, UUIDSchema } from "@/shared/application/validation";
import { z } from "zod";

export const GetDateAwareAvailabilitySchema = z
  .object({
    productId: UUIDSchema,
    warehouseId: UUIDSchema,
    startDate: DateSchema,
    endDate: DateSchema,
    excludeRentalOrderId: UUIDSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate.getTime() < value.startDate.getTime()) {
      ctx.addIssue({
        code: "custom",
        message: "End date cannot be before start date",
        path: ["endDate"],
      });
    }
  });

export type GetDateAwareAvailabilityInput = z.infer<
  typeof GetDateAwareAvailabilitySchema
>;

/** Pre-parse params (ISO strings or Date) accepted by the application service. */
export type GetDateAwareAvailabilityParams = z.input<
  typeof GetDateAwareAvailabilitySchema
>;
