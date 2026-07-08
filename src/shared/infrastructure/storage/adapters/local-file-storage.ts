import fs from "node:fs/promises";
import path from "node:path";

import { UnprocessableError } from "@/shared/infrastructure/errors";
import type { ILogger } from "@/shared/infrastructure/logging";

import type { IFileStorage } from "../file-storage.interface";
import { mapStorageError } from "../storage-error-mapper";
import { normalizeStorageKey, validateUploadInput } from "../storage-key";
import {
  buildPublicFileUrl,
  resolveStorageFilePath,
} from "../storage-path";
import type {
  DeleteResult,
  SignedUrlResult,
  StoredFile,
  UploadInput,
} from "../storage-types";

export interface LocalFileStorageOptions {
  basePath: string;
  publicBaseUrl: string;
  logger?: ILogger;
}

export class LocalFileStorage implements IFileStorage {
  private readonly basePath: string;
  private readonly publicBaseUrl: string;
  private readonly logger?: ILogger;

  constructor(options: LocalFileStorageOptions) {
    this.basePath = options.basePath;
    this.publicBaseUrl = options.publicBaseUrl;
    this.logger = options.logger;
  }

  async upload(input: UploadInput): Promise<StoredFile> {
    validateUploadInput(input);

    const key = normalizeStorageKey(input.key);
    const filePath = resolveStorageFilePath(this.basePath, key);

    try {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, input.buffer);

      const storedFile: StoredFile = {
        key,
        url: buildPublicFileUrl(this.publicBaseUrl, key),
        mimeType: input.mimeType,
        size: input.size,
      };

      this.logger?.info("File uploaded to local storage", {
        key,
        size: input.size,
        mimeType: input.mimeType,
      });

      return storedFile;
    } catch (error) {
      this.logger?.error("Failed to upload file to local storage", error, {
        key,
        size: input.size,
        mimeType: input.mimeType,
      });

      throw mapStorageError(error);
    }
  }

  async delete(key: string): Promise<DeleteResult> {
    const normalizedKey = normalizeStorageKey(key);
    const filePath = resolveStorageFilePath(this.basePath, normalizedKey);

    try {
      await fs.unlink(filePath);

      this.logger?.info("File deleted from local storage", {
        key: normalizedKey,
      });

      return { key: normalizedKey };
    } catch (error) {
      this.logger?.error("Failed to delete file from local storage", error, {
        key: normalizedKey,
      });

      throw mapStorageError(error);
    }
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds: number,
  ): Promise<SignedUrlResult> {
    normalizeStorageKey(key);

    throw new UnprocessableError({
      message: "Signed URLs are not supported by the local file storage provider",
      details: {
        key,
        provider: "local",
        expiresInSeconds,
      },
    });
  }
}
