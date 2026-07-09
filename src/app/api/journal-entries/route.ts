import type { NextRequest } from "next/server";

import {
  handleCreateJournalEntry,
  handleListJournalEntries,
} from "@/modules/accounting/presentation/routes/journal-entry-api.routes";

import { resolveAccountingApplicationServices } from "../accounts/_composition/resolve-accounting-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListJournalEntries(
    request,
    resolveAccountingApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateJournalEntry(
    request,
    resolveAccountingApplicationServices,
  );
}
