import { z } from "zod";

export function createRequiredStringSchema(message: string) {
  return z.string().trim().min(1, message);
}

export function createEmailSchema(message = "Enter a valid email address.") {
  return z.email({ message });
}

export function createPasswordSchema(minLength = 8) {
  return z
    .string()
    .min(minLength, `Password must be at least ${minLength} characters.`);
}

export function createOptionalStringSchema() {
  return z.string().trim().optional().or(z.literal(""));
}

export function getFormErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues[0]?.message ?? "Validation failed.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Validation failed.";
}
