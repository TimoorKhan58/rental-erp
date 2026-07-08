import type { ILogger, LoggerBindings } from "./logger";

export interface RequestLoggerContext {
  requestId?: string;
  userId?: string;
  module?: string;
  route?: string;
}

export function createRequestLogger(
  logger: ILogger,
  context: RequestLoggerContext,
): ILogger {
  const bindings: LoggerBindings = {};

  if (context.requestId !== undefined) {
    bindings.requestId = context.requestId;
  }

  if (context.userId !== undefined) {
    bindings.userId = context.userId;
  }

  if (context.module !== undefined) {
    bindings.module = context.module;
  }

  if (context.route !== undefined) {
    bindings.route = context.route;
  }

  return logger.child(bindings);
}
