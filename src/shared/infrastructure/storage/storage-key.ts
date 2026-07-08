import { ValidationError } from "@/shared/infrastructure/errors";

import type { UploadInput } from "./storage-types";

export function normalizeStorageKey(key: string): string {
  const trimmed = key.trim().replace(/^\/+/, "").replace(/\\/g, "/");

  if (trimmed.length === 0 || trimmed.includes("..")) {
    throw new ValidationError({
      message: "Invalid storage key",
      details: { key },
    });
  }

  return trimmed;
}

export function validateUploadInput(input: UploadInput): void {
  normalizeStorageKey(input.key);

  if (input.buffer.length === 0) {
    throw new ValidationError({
      message: "Upload buffer must not be empty",
      details: { field: "buffer" },
    });
  }

  if (input.size <= 0) {
    throw new ValidationError({
      message: "Upload size must be greater than zero",
      details: { field: "size" },
    });
  }

  if (input.buffer.length !== input.size) {
    throw new ValidationError({
      message: "Upload size does not match buffer length",
      details: { field: "size", bufferLength: input.buffer.length },
    });
  }

  if (input.mimeType.trim().length === 0) {
    throw new ValidationError({
      message: "Upload mime type is required",
      details: { field: "mimeType" },
    });
  }
}
