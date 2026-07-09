import type { NextRequest } from "next/server";

import {
  handleGetJournalEntryById,
  handleUpdateJournalEntry,
} from "@/modules/accounting/presentation/routes/journal-entry-api.routes";

import { resolveAccountingApplicationServices } from "../../accounts/_composition/resolve-accounting-services";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return handleGetJournalEntryById(
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
  return handleUpdateJournalEntry(
    request,
    id,
    resolveAccountingApplicationServices,
  );
}
