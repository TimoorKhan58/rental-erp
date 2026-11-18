import { z } from "zod";

import { PasswordSchema } from "@/shared/application/validation/common-schemas";

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Short names are part of URLs and scripts; keep them web-safe. */
const RESERVED_SLUGS = new Set(["admin", "api", "platform", "login", "logout", "www", "app"]);

export const BusinessSlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(40, "Use at most 40 characters")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes")
  .refine((value) => !RESERVED_SLUGS.has(value), "This short name is reserved");

/** Create a business with its owner (SaaS phase 3c). */
export const CreateBusinessSchema = z.object({
  name: z.string().trim().min(2, "Enter the business name").max(120),
  slug: BusinessSlugSchema,
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. PKR"),
  currencySymbol: z.string().trim().min(1, "Enter the currency symbol").max(5),
  timezone: z.string().trim().refine(isTimeZone, "Choose a valid time zone, e.g. Asia/Karachi"),
  owner: z.object({
    name: z.string().trim().min(2, "Enter the owner's name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    temporaryPassword: PasswordSchema,
  }),
});
export type CreateBusinessInput = z.infer<typeof CreateBusinessSchema>;

export const SetBusinessActiveSchema = z.object({ isActive: z.boolean() });

export const ResetOwnerPasswordSchema = z.object({ temporaryPassword: PasswordSchema });
