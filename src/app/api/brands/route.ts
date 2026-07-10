import type { NextRequest } from "next/server";

import {
  handleCreateBrand,
  handleListBrands,
} from "@/modules/catalog/presentation/routes/brand-api.routes";

import { resolveCatalogApplicationServices } from "../categories/_composition/resolve-catalog-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListBrands(request, resolveCatalogApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateBrand(request, resolveCatalogApplicationServices);
}
