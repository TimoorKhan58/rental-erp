import type { NextRequest } from "next/server";

import {
  handleDeleteUnit,
  handleGetUnitById,
  handleUpdateUnit,
} from "@/modules/catalog/presentation/routes/unit-api.routes";

import { resolveCatalogApplicationServices } from "../../categories/_composition/resolve-catalog-services";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetUnitById(request, id, resolveCatalogApplicationServices);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateUnit(request, id, resolveCatalogApplicationServices);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteUnit(request, id, resolveCatalogApplicationServices);
}
