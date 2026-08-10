import { z } from "zod";
import { ATTRIBUTE_DATA_TYPES } from "../types";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().nullable().or(z.literal(""));

export const categoryBrandFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: optionalText(2000),
  isActive: z.boolean(),
});

export const unitFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, underscore, or hyphen"),
  name: z.string().trim().min(1, "Name is required").max(200),
  description: optionalText(2000),
  isActive: z.boolean(),
});

export const attributeFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  dataType: z.enum(ATTRIBUTE_DATA_TYPES),
  isActive: z.boolean(),
});

export const tagFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  color: z
    .string()
    .trim()
    .regex(/^$|^#[0-9A-Fa-f]{6}$/, "Use #RRGGBB or leave blank")
    .optional()
    .nullable()
    .or(z.literal("")),
  isActive: z.boolean(),
});

export type CategoryBrandFormValues = z.infer<typeof categoryBrandFormSchema>;
export type UnitFormValues = z.infer<typeof unitFormSchema>;
export type AttributeFormValues = z.infer<typeof attributeFormSchema>;
export type TagFormValues = z.infer<typeof tagFormSchema>;
