import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { runWithRepositoryUnitOfWork } from "./run-with-repository-unit-of-work";
import type {
  IUnitOfWork,
  RepositoryUnitOfWorkContext,
} from "./unit-of-work-types";

export class RepositoryUnitOfWork implements IUnitOfWork {
  constructor(private readonly deps: SharedDeps) {}

  run<T>(
    operation: (context: RepositoryUnitOfWorkContext) => Promise<T>,
  ): Promise<T> {
    return runWithRepositoryUnitOfWork(this.deps, operation);
  }
}

export function createRepositoryUnitOfWork(deps: SharedDeps): IUnitOfWork {
  return new RepositoryUnitOfWork(deps);
}
