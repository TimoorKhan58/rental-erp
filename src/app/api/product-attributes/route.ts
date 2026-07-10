import type { NextRequest } from "next/server";

import {
  handleCreateAttribute,
  handleListAttributes,
} from "@/modules/catalog/presentation/routes/attribute-api.routes";

import { resolveCatalogApplicationServices } from "../categories/_composition/resolve-catalog-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListAttributes(request, resolveCatalogApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateAttribute(request, resolveCatalogApplicationServices);
}
