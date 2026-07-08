import type { NextRequest } from "next/server";

import {
  handleDeleteCustomer,
  handleGetCustomerById,
  handleUpdateCustomer,
} from "@/modules/customer/presentation/routes/customer-api.routes";

import { resolveCustomerApplicationServices } from "../_composition/resolve-customer-services";

interface CustomerRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: CustomerRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetCustomerById(
    request,
    id,
    resolveCustomerApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: CustomerRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateCustomer(
    request,
    id,
    resolveCustomerApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: CustomerRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteCustomer(
    request,
    id,
    resolveCustomerApplicationServices,
  );
}
