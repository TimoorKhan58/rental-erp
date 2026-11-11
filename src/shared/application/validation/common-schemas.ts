import { z } from "zod";

export const UUIDSchema = z.string().uuid();

export const DateSchema = z.coerce.date();

export const OptionalDateSchema = z.preprocess((value) => {
  if (value === "" || value === null) {
    return undefined;
  }

  return value;
}, z.coerce.date().optional());

export const PositiveIntSchema = z.coerce.number().int().positive();

export const NonNegativeIntSchema = z.coerce.number().int().nonnegative();

export const PositiveNumberSchema = z.coerce.number().positive();

/** Trimmed text that must not be empty — "   " is rejected as missing (QA-006). */
export const NonEmptyStringSchema = z
  .string()
  .trim()
  .min(1, "This field is required");

/**
 * Password input: kept exactly as typed (never trimmed, so sign-in matches
 * what was stored) but must contain at least one non-space character.
 */
export const PasswordSchema = z
  .string()
  .min(8)
  .max(128)
  .refine((value) => value.trim().length > 0, {
    message: "Password cannot be only spaces",
  });

export const TrimmedStringSchema = z.string().trim();

export const EmailSchema = z.string().trim().email();

export const PhoneSchema = z
  .string()
  .trim()
  .min(7, "Phone number is too short")
  .max(20, "Phone number is too long")
  .regex(/^[+]?[\d\s()-]+$/, "Invalid phone number format");

export const BooleanStringSchema = z.preprocess((value) => {
  if (value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "1") {
      return true;
    }

    if (normalized === "false" || normalized === "0") {
      return false;
    }
  }

  return value;
}, z.boolean());

export const SortOrderSchema = z.enum(["asc", "desc"]);

export type SortOrder = z.infer<typeof SortOrderSchema>;
