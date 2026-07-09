import type { NextRequest } from "next/server";

import {
  handleCreateRentalOrder,
  handleListRentalOrders,
} from "@/modules/rental-order/presentation/routes/rental-order-api.routes";

import { resolveRentalOrderApplicationServices } from "./_composition/resolve-rental-order-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListRentalOrders(
    request,
    resolveRentalOrderApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateRentalOrder(
    request,
    resolveRentalOrderApplicationServices,
  );
}
