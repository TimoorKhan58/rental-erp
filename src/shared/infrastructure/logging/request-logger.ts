import type { ILogger, LoggerBindings } from "./logger";

export interface RequestLoggerContext {
  requestId?: string;
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  module?: string;
  route?: string;
  httpMethod?: string;
}

export function createRequestLogger(
  logger: ILogger,
  context: RequestLoggerContext,
): ILogger {
  const bindings: LoggerBindings = {};

  if (context.requestId !== undefined) {
    bindings.requestId = context.requestId;
  }

  if (context.correlationId !== undefined) {
    bindings.correlationId = context.correlationId;
  }

  if (context.tenantId !== undefined) {
    bindings.tenantId = context.tenantId;
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

  if (context.httpMethod !== undefined) {
    bindings.httpMethod = context.httpMethod;
  }

  return logger.child(bindings);
}
