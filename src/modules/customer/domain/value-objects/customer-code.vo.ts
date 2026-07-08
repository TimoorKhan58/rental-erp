import type { Brand } from "@/shared/domain/ids";

import { CustomerInvariantError } from "../customer.errors";

export type CustomerCode = Brand<string, "CustomerCode">;

export function createCustomerCode(value: string): CustomerCode {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new CustomerInvariantError("Customer code is required", "customerCode");
  }

  if (trimmed.length > 50) {
    throw new CustomerInvariantError(
      "Customer code must not exceed 50 characters",
      "customerCode",
    );
  }

  return trimmed as CustomerCode;
}
