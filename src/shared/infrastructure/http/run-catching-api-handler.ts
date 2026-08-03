import type { NextRequest } from "next/server";

import {
  normalizeError,
  serializeAppError,
} from "@/shared/infrastructure/errors";
import { errorResponse } from "@/shared/infrastructure/http/api-response";
import { getRequestId } from "@/shared/infrastructure/http/headers";
import { toJsonResponse } from "@/shared/infrastructure/http/to-json-response";

/**
 * Catches validation / JSON parse errors thrown *before* module route runners
 * so clients always receive the standard `{ error, requestId }` envelope.
 */
export async function runCatchingApiHandler(
  request: NextRequest,
  execute: () => Promise<Response>,
): Promise<Response> {
  try {
    return await execute();
  } catch (error) {
    const requestId = getRequestId(request.headers);
    const normalized = normalizeError(error);
    const serialized = serializeAppError(normalized, requestId);

    return toJsonResponse({
      status: normalized.httpStatus,
      body: errorResponse(serialized.error, requestId),
    });
  }
}
