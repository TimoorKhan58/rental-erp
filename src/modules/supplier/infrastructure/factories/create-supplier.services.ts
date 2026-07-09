import type { SupplierApplicationServices as SupplierApplicationServicesBase } from "@/modules/supplier/application/services/supplier-application-services.interface";
import { CreateSupplierService } from "@/modules/supplier/application/services/create-supplier.service";
import {
  SupplierService,
  type ISupplierService,
} from "@/modules/supplier/application/services/supplier.service";
import { DeleteSupplierService } from "@/modules/supplier/application/services/delete-supplier.service";
import { GetSupplierByIdService } from "@/modules/supplier/application/services/get-supplier-by-id.service";
import { ListSuppliersService } from "@/modules/supplier/application/services/list-suppliers.service";
import { UpdateSupplierService } from "@/modules/supplier/application/services/update-supplier.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createSupplierRepositoryFromSharedDeps } from "./create-supplier.repository";
import { createSupplierTransactionRunner } from "./create-supplier-transaction.runner";

export type { SupplierApplicationServicesBase as SupplierApplicationServices };

export interface WiredSupplierApplicationServices
  extends SupplierApplicationServicesBase {
  supplierService: ISupplierService;
}

export function createSupplierApplicationServices(
  deps: SharedDeps,
): WiredSupplierApplicationServices {
  const repository = createSupplierRepositoryFromSharedDeps(deps);
  const transactionRunner = createSupplierTransactionRunner(deps);

  const getSupplierById = new GetSupplierByIdService(repository);
  const listSuppliers = new ListSuppliersService(repository);
  const createSupplier = new CreateSupplierService(transactionRunner);
  const updateSupplier = new UpdateSupplierService(transactionRunner);
  const deleteSupplier = new DeleteSupplierService(transactionRunner);

  return {
    getSupplierById,
    listSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    supplierService: new SupplierService(
      getSupplierById,
      listSuppliers,
      createSupplier,
      updateSupplier,
      deleteSupplier,
    ),
  };
}
