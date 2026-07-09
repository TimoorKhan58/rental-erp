import type { NextRequest } from "next/server";

import {
  handleGetRentalOrderById,
  handleUpdateRentalOrder,
} from "@/modules/rental-order/presentation/routes/rental-order-api.routes";

import { resolveRentalOrderApplicationServices } from "../_composition/resolve-rental-order-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleGetRentalOrderById(
    request,
    id,
    resolveRentalOrderApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;

  return handleUpdateRentalOrder(
    request,
    id,
    resolveRentalOrderApplicationServices,
  );
}
