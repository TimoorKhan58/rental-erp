import type { NextRequest } from "next/server";

import {
  handleCreateCategory,
  handleListCategories,
} from "@/modules/catalog/presentation/routes/category-api.routes";

import { resolveCatalogApplicationServices } from "./_composition/resolve-catalog-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListCategories(request, resolveCatalogApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateCategory(request, resolveCatalogApplicationServices);
}
