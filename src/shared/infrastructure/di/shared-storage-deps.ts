import type { ExecutionContext } from "@/shared/application/context";
import { createFileStorage } from "@/shared/infrastructure/storage/create-file-storage";
import type { IFileStorage } from "@/shared/infrastructure/storage/file-storage.interface";
import type { ILogger } from "@/shared/infrastructure/logging";

export interface SharedStorageDeps {
  readonly fileStorage: IFileStorage;
}

export interface CreateSharedStorageDepsOptions {
  logger?: ILogger;
}

export function createSharedStorageDeps(
  options: CreateSharedStorageDepsOptions = {},
): SharedStorageDeps {
  return {
    fileStorage: createFileStorage({ logger: options.logger }),
  };
}

export function createFileStorageFromExecutionContext(
  ctx: ExecutionContext,
): IFileStorage {
  return createFileStorage({ logger: ctx.logger });
}
