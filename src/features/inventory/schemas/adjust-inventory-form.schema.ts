import { z } from "zod";

export const adjustInventoryFormSchema = z.object({
  direction: z.enum(["increase", "decrease"]),
  quantity: z
    .number({ message: "Enter a valid quantity" })
    .int("Must be a whole number")
    .positive("Quantity must be greater than zero"),
  remarks: z
    .string()
    .trim()
    .min(3, "Enter a short reason for this adjustment")
    .max(500, "Remarks must be 500 characters or less"),
});

export type AdjustInventoryFormValues = z.infer<typeof adjustInventoryFormSchema>;
