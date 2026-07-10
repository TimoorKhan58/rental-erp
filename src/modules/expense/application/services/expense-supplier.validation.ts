import type { ISupplierRepository } from "@/modules/supplier/domain/supplier.repository.interface";
import type { SupplierId } from "@/shared/domain/ids";
import { NotFoundError } from "@/shared/infrastructure/errors";

export async function validateSupplierForExpense(
  supplierRepository: ISupplierRepository | undefined,
  supplierId: SupplierId,
): Promise<void> {
  if (supplierRepository === undefined) {
    throw new NotFoundError({
      message: "Supplier repository is not available",
      details: { supplierId },
    });
  }

  const exists = await supplierRepository.exists(supplierId);

  if (!exists) {
    throw new NotFoundError({
      message: "Supplier not found",
      details: { supplierId },
    });
  }
}
