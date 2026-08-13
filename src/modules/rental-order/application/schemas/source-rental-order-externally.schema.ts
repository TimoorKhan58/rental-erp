import { z } from "zod";

import {
  PositiveIntSchema,
  UUIDSchema,
} from "@/shared/application/validation";

const NonNegativeNumberSchema = z.coerce.number().nonnegative();

export const SourceRentalOrderExternallySchema = z
  .object({
    rentalOrderItemId: UUIDSchema,
    supplierId: UUIDSchema,
    quantity: PositiveIntSchema,
    unitCost: NonNegativeNumberSchema,
  })
  .strict();

export type SourceRentalOrderExternallyInput = z.infer<
  typeof SourceRentalOrderExternallySchema
>;
