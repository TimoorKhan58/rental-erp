import type { NextRequest } from "next/server";

import { handleSettleExternalRental } from "@/modules/external-rental/presentation/routes/external-rental-api.routes";

import { resolveExternalRentalApplicationServices } from "../../_composition/resolve-external-rental-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleSettleExternalRental(
    request,
    id,
    resolveExternalRentalApplicationServices,
  );
}
