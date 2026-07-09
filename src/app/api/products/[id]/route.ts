import type { NextRequest } from "next/server";

import {
  handleDeleteProduct,
  handleGetProductById,
  handleUpdateProduct,
} from "@/modules/product/presentation/routes/product-api.routes";

import { resolveProductApplicationServices } from "../_composition/resolve-product-services";

interface ProductRouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: ProductRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleGetProductById(
    request,
    id,
    resolveProductApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: ProductRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateProduct(
    request,
    id,
    resolveProductApplicationServices,
  );
}

export async function DELETE(
  request: NextRequest,
  context: ProductRouteContext,
): Promise<Response> {
  const { id } = await context.params;
  return handleDeleteProduct(
    request,
    id,
    resolveProductApplicationServices,
  );
}
