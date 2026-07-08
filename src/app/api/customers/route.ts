import type { NextRequest } from "next/server";

import {
  handleCreateCustomer,
  handleListCustomers,
} from "@/modules/customer/presentation/routes/customer-api.routes";

import { resolveCustomerApplicationServices } from "./_composition/resolve-customer-services";

export async function GET(request: NextRequest): Promise<Response> {
  return handleListCustomers(request, resolveCustomerApplicationServices);
}

export async function POST(request: NextRequest): Promise<Response> {
  return handleCreateCustomer(request, resolveCustomerApplicationServices);
}
