import type { NextRequest } from "next/server";

import {
  handleCreateTag,
  handleListTags,
} from "@/modules/catalog/presentation/routes/tag-api.routes";

import { resolveCatalogApplicationServices } from "../categories/_composition/resolve-catalog-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListTags(request, resolveCatalogApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateTag(request, resolveCatalogApplicationServices);
}
