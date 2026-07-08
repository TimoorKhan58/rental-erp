import { type ZodError, type ZodType } from "zod";

import { ValidationError } from "@/shared/infrastructure/errors";

export interface ValidationIssueDetail {
  path: string;
  message: string;
}

function formatZodIssues(error: ZodError): ValidationIssueDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String).join(".") || "(root)",
    message: issue.message,
  }));
}

export function parseRequest<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  throw new ValidationError({
    details: formatZodIssues(result.error),
    cause: result.error,
  });
}
