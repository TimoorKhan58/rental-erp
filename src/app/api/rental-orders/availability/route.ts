import type { NextRequest } from "next/server";

import { handleGetDateAwareAvailability } from "@/modules/rental-order/presentation/routes/rental-order-api.routes";

import { resolveRentalOrderApplicationServices } from "../_composition/resolve-rental-order-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleGetDateAwareAvailability(
    request,
    resolveRentalOrderApplicationServices,
  );
}
