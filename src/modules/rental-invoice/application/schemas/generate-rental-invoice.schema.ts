import { z } from "zod";

import { UUIDSchema } from "@/shared/application/validation";

export const GenerateRentalInvoiceFromOrderSchema = z.object({
  rentalOrderId: UUIDSchema,
});

export type GenerateRentalInvoiceFromOrderInput = z.infer<
  typeof GenerateRentalInvoiceFromOrderSchema
>;
