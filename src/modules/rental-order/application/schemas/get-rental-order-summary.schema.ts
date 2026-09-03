import {
  OptionalDateSchema,
  TrimmedStringSchema,
  UUIDSchema,
} from "@/shared/application/validation";
import { z } from "zod";

import { RentalOrderStatusFilterSchema } from "./rental-order.schemas";

export const GetRentalOrderSummarySchema = z
  .object({
    status: RentalOrderStatusFilterSchema.optional(),
    customerId: UUIDSchema.optional(),
    warehouseId: UUIDSchema.optional(),
    eventFrom: OptionalDateSchema,
    eventTo: OptionalDateSchema,
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
  })
  .superRefine((value, ctx) => {
    if (
      value.eventFrom !== undefined &&
      value.eventTo !== undefined &&
      value.eventTo.getTime() < value.eventFrom.getTime()
    ) {
      ctx.addIssue({
        code: "custom",
        message: "eventTo cannot be before eventFrom",
        path: ["eventTo"],
      });
    }
  });

export type GetRentalOrderSummaryInput = z.infer<
  typeof GetRentalOrderSummarySchema
>;
