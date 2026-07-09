import type { NextRequest } from "next/server";

import {
  handleCreateRepair,
  handleListRepairs,
} from "@/modules/repair/presentation/routes/repair-api.routes";

import { resolveRepairApplicationServices } from "./_composition/resolve-repair-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListRepairs(request, resolveRepairApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateRepair(request, resolveRepairApplicationServices);
}
