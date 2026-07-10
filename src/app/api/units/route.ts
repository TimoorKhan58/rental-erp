import type { NextRequest } from "next/server";

import {
  handleCreateUnit,
  handleListUnits,
} from "@/modules/catalog/presentation/routes/unit-api.routes";

import { resolveCatalogApplicationServices } from "../categories/_composition/resolve-catalog-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListUnits(request, resolveCatalogApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateUnit(request, resolveCatalogApplicationServices);
}
