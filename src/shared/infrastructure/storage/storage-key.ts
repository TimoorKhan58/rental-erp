import { storageConfig } from "@/shared/config/storage.config";
import { ValidationError } from "@/shared/infrastructure/errors";

import type { UploadInput } from "./storage-types";

const DEFAULT_ALLOWED_EXTENSIONS = new Set(
  storageConfig.allowedExtensions.map((ext) => ext.toLowerCase()),
);

const DEFAULT_ALLOWED_MIME_TYPES = new Set(
  storageConfig.allowedMimeTypes.map((mime) => mime.toLowerCase()),
);

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

function extensionFromKey(key: string): string {
  const base = key.split("/").pop() ?? key;
  const dot = base.lastIndexOf(".");
  if (dot <= 0 || dot === base.length - 1) {
    return "";
  }
  return base.slice(dot + 1).toLowerCase();
}

export function validateUploadInput(input: UploadInput): void {
  const key = normalizeStorageKey(input.key);

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

  if (input.size > storageConfig.maxFileSizeBytes) {
    throw new ValidationError({
      message: `Upload exceeds maximum size of ${storageConfig.maxFileSizeMb}MB`,
      details: {
        field: "size",
        maxBytes: storageConfig.maxFileSizeBytes,
        actualBytes: input.size,
      },
    });
  }

  const mimeType = input.mimeType.trim().toLowerCase();
  if (mimeType.length === 0) {
    throw new ValidationError({
      message: "Upload mime type is required",
      details: { field: "mimeType" },
    });
  }

  if (!DEFAULT_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new ValidationError({
      message: "Upload mime type is not allowed",
      details: {
        field: "mimeType",
        mimeType,
        allowed: [...DEFAULT_ALLOWED_MIME_TYPES],
      },
    });
  }

  const extension = extensionFromKey(key);
  if (!extension || !DEFAULT_ALLOWED_EXTENSIONS.has(extension)) {
    throw new ValidationError({
      message: "Upload file extension is not allowed",
      details: {
        field: "key",
        extension: extension || null,
        allowed: [...DEFAULT_ALLOWED_EXTENSIONS],
      },
    });
  }
}
