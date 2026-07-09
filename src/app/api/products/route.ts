import type { NextRequest } from "next/server";

import {
  handleCreateProduct,
  handleListProducts,
} from "@/modules/product/presentation/routes/product-api.routes";

import { resolveProductApplicationServices } from "./_composition/resolve-product-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListProducts(request, resolveProductApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateProduct(request, resolveProductApplicationServices);
}
