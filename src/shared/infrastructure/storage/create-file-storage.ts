import { appConfig } from "@/shared/config/app.config";
import { InternalError, UnprocessableError } from "@/shared/infrastructure/errors";
import type { ILogger } from "@/shared/infrastructure/logging";

import { LocalFileStorage } from "./adapters/local-file-storage";
import type { IFileStorage } from "./file-storage.interface";

export interface CreateFileStorageOptions {
  logger?: ILogger;
}

export function createFileStorage(
  options: CreateFileStorageOptions = {},
): IFileStorage {
  const { storage, path } = appConfig.uploads;

  if (storage === "local") {
    return new LocalFileStorage({
      basePath: path,
      publicBaseUrl: appConfig.url,
      logger: options.logger,
    });
  }

  if (storage === "s3") {
    throw new UnprocessableError({
      message: "S3 file storage is not implemented yet",
      details: { provider: storage },
    });
  }

  throw new InternalError({
    message: `Unsupported file storage provider "${storage}"`,
  });
}
