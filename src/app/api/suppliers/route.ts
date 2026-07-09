import type { NextRequest } from "next/server";

import {
  handleCreateSupplier,
  handleListSuppliers,
} from "@/modules/supplier/presentation/routes/supplier-api.routes";

import { resolveSupplierApplicationServices } from "./_composition/resolve-supplier-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListSuppliers(request, resolveSupplierApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateSupplier(request, resolveSupplierApplicationServices);
}
