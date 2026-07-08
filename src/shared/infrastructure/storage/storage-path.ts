import path from "node:path";

import { ValidationError } from "@/shared/infrastructure/errors";

import { normalizeStorageKey } from "./storage-key";

export function resolveStorageBasePath(basePath: string): string {
  return path.resolve(basePath);
}

export function resolveStorageFilePath(basePath: string, key: string): string {
  const normalizedKey = normalizeStorageKey(key);
  const baseDir = resolveStorageBasePath(basePath);
  const filePath = path.resolve(baseDir, normalizedKey);

  if (filePath !== baseDir && !filePath.startsWith(`${baseDir}${path.sep}`)) {
    throw new ValidationError({
      message: "Invalid storage key path",
      details: { key: normalizedKey },
    });
  }

  return filePath;
}

export function buildPublicFileUrl(publicBaseUrl: string, key: string): string {
  const normalizedKey = normalizeStorageKey(key);
  const baseUrl = publicBaseUrl.replace(/\/+$/, "");
  const encodedKey = normalizedKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${baseUrl}/uploads/${encodedKey}`;
}
