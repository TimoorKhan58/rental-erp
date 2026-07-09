import type { Brand } from "@/shared/domain/ids";

import { ProductInvariantError } from "../product.errors";

export type RentalRate = Brand<number, "RentalRate">;

export function createRentalRate(value: number): RentalRate {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ProductInvariantError(
      "Rental rate must be greater than zero",
      "rentalRate",
    );
  }

  return value as RentalRate;
}
