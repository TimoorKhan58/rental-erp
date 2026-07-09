import type { NextRequest } from "next/server";

import { handleReserveRentalOrder } from "@/modules/rental-order/presentation/routes/rental-order-api.routes";

import { resolveRentalOrderApplicationServices } from "../../_composition/resolve-rental-order-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleReserveRentalOrder(
    request,
    id,
    resolveRentalOrderApplicationServices,
  );
}
