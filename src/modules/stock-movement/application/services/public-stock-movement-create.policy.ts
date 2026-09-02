import type { RequestContext } from "@/shared/application/context";
import { assertAll, PERMISSIONS } from "@/shared/application/authorization";
import { UnprocessableError } from "@/shared/infrastructure/errors";

import type { CreateStockMovementInput } from "../schemas/stock-movement.schemas";

const PUBLIC_POST_ALLOWED_MOVEMENT_TYPES = ["ADJUSTMENT"] as const;

/**
 * Phase 51 (DL-51-01 / F-33-03): public POST policy boundary.
 * Internal workflows call executeCreateStockMovementInScope directly and are not
 * subject to this restriction.
 */
export function assertPublicStockMovementCreateAllowed(
  ctx: RequestContext,
  input: CreateStockMovementInput,
): void {
  if (input.movementType !== "ADJUSTMENT") {
    throw new UnprocessableError({
      message:
        "Only ADJUSTMENT stock movements may be created through this endpoint. Use the appropriate workflow command for IN, OUT, RESERVE, and RELEASE movements.",
      details: {
        movementType: input.movementType,
        allowedMovementTypes: [...PUBLIC_POST_ALLOWED_MOVEMENT_TYPES],
      },
    });
  }

  assertAll(ctx, [
    PERMISSIONS.stockMovements.create,
    PERMISSIONS.inventory.adjust,
  ]);
}
