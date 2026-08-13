import type { NextRequest } from "next/server";

import { handleWriteOffExternalRental } from "@/modules/external-rental/presentation/routes/external-rental-api.routes";

import { resolveExternalRentalApplicationServices } from "../../_composition/resolve-external-rental-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleWriteOffExternalRental(
    request,
    id,
    resolveExternalRentalApplicationServices,
  );
}
