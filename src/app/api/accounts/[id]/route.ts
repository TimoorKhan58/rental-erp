import type { NextRequest } from "next/server";

import {
  handleGetAccountById,
  handleUpdateAccount,
} from "@/modules/accounting/presentation/routes/account-api.routes";

import { resolveAccountingApplicationServices } from "../_composition/resolve-accounting-services";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetAccountById(
    request,
    id,
    resolveAccountingApplicationServices,
  );
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleUpdateAccount(
    request,
    id,
    resolveAccountingApplicationServices,
  );
}
