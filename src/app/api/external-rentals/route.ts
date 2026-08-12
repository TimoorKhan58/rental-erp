import type { NextRequest } from "next/server";

import {
  handleCreateExternalRental,
  handleListExternalRentals,
} from "@/modules/external-rental/presentation/routes/external-rental-api.routes";

import { resolveExternalRentalApplicationServices } from "./_composition/resolve-external-rental-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListExternalRentals(
    request,
    resolveExternalRentalApplicationServices,
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateExternalRental(
    request,
    resolveExternalRentalApplicationServices,
  );
}
