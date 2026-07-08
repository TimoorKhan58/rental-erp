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

export const NonEmptyStringSchema = z.string().min(1);

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
