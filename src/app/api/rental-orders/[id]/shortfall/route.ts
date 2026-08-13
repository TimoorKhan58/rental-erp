import type { NextRequest } from "next/server";

import { handleGetRentalOrderShortfall } from "@/modules/rental-order/presentation/routes/rental-order-api.routes";

import { resolveRentalOrderApplicationServices } from "../../_composition/resolve-rental-order-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleGetRentalOrderShortfall(
    request,
    id,
    resolveRentalOrderApplicationServices,
  );
}
