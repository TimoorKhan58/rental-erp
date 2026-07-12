import { env } from "./env";

/** Default allowlist aligned with settings.constants DEFAULT_SYSTEM_SETTINGS. */
const DEFAULT_UPLOAD_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "doc",
  "docx",
  "xls",
  "xlsx",
] as const;

const DEFAULT_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const storageConfig = {
  provider: env.UPLOAD_STORAGE,
  path: env.UPLOAD_PATH,
  maxFileSizeMb: env.UPLOAD_MAX_FILE_SIZE_MB,
  maxFileSizeBytes: Math.floor(env.UPLOAD_MAX_FILE_SIZE_MB * 1024 * 1024),
  allowedExtensions: DEFAULT_UPLOAD_EXTENSIONS,
  allowedMimeTypes: DEFAULT_UPLOAD_MIME_TYPES,
} as const;

export type StorageConfig = typeof storageConfig;
