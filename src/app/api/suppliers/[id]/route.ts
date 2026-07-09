import type { NextRequest } from "next/server";

import {
  handleDeleteSupplier,
  handleGetSupplierById,
  handleUpdateSupplier,
} from "@/modules/supplier/presentation/routes/supplier-api.routes";

import { resolveSupplierApplicationServices } from "../_composition/resolve-supplier-services";

interface SupplierRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: SupplierRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetSupplierById(
    request,
    id,
    resolveSupplierApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: SupplierRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateSupplier(
    request,
    id,
    resolveSupplierApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: SupplierRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteSupplier(
    request,
    id,
    resolveSupplierApplicationServices,
  );
}
