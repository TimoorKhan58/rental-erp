import type { ExecutionContext } from "@/shared/application/context";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import {
  createRepositoryRunnerFromExecutionContext,
  createRepositoryRunnerFromSharedDeps,
} from "../create-repository-base";
import type { RepositoryBaseOptions } from "../repository-types";
import type { RepositoryRunner } from "../repository-runner";
import {
  createObservableRepositoryRunner,
  type ObservableRepositoryRunnerOptions,
} from "./observable-repository-runner";
import {
  createRepositoryObservationContextFromExecutionContext,
  type RepositoryObservationContext,
} from "./repository-observation-context";
import type { IRepositoryMetrics } from "./repository-metrics.interface";

export interface CreateObservableRepositoryRunnerOptions {
  tx?: RepositoryBaseOptions["tx"];
  metrics?: IRepositoryMetrics;
  observationContext?: RepositoryObservationContext;
  repositoryName?: string;
}

export function createObservableRepositoryRunnerFromSharedDeps(
  deps: Pick<SharedDeps, "prisma" | "logger">,
  options: CreateObservableRepositoryRunnerOptions = {},
): RepositoryRunner {
  const runner = createRepositoryRunnerFromSharedDeps(deps, options.tx);

  return createObservableRepositoryRunner({
    runner,
    logger: deps.logger,
    metrics: options.metrics,
    observationContext: options.observationContext,
    repositoryName: options.repositoryName,
  });
}

export function createObservableRepositoryRunnerFromExecutionContext(
  deps: Pick<SharedDeps, "prisma">,
  ctx: ExecutionContext,
  options: Omit<
    CreateObservableRepositoryRunnerOptions,
    "observationContext"
  > = {},
): RepositoryRunner {
  const runner = createRepositoryRunnerFromExecutionContext(deps, ctx);

  return createObservableRepositoryRunner({
    runner,
    logger: ctx.logger,
    metrics: options.metrics,
    observationContext:
      createRepositoryObservationContextFromExecutionContext(ctx),
    repositoryName: options.repositoryName,
  });
}

export function wrapRepositoryRunnerWithObservability(
  runner: RepositoryRunner,
  options: Omit<ObservableRepositoryRunnerOptions, "runner">,
): RepositoryRunner {
  return createObservableRepositoryRunner({
    runner,
    ...options,
  });
}
