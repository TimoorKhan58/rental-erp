import type { CustomerApplicationServices as CustomerApplicationServicesBase } from "@/modules/customer/application/services/customer-application-services.interface";
import { CreateCustomerService } from "@/modules/customer/application/services/create-customer.service";
import {
  CustomerService,
  type ICustomerService,
} from "@/modules/customer/application/services/customer.service";
import { DeleteCustomerService } from "@/modules/customer/application/services/delete-customer.service";
import { GetCustomerByIdService } from "@/modules/customer/application/services/get-customer-by-id.service";
import { ListCustomersService } from "@/modules/customer/application/services/list-customers.service";
import { UpdateCustomerService } from "@/modules/customer/application/services/update-customer.service";
import type { SharedDeps } from "@/shared/infrastructure/di/shared-deps";

import { createCustomerRepositoryFromSharedDeps } from "./create-customer.repository";
import { createCustomerTransactionRunner } from "./create-customer-transaction.runner";

export type { CustomerApplicationServicesBase as CustomerApplicationServices };

export interface WiredCustomerApplicationServices
  extends CustomerApplicationServicesBase {
  customerService: ICustomerService;
}

export function createCustomerApplicationServices(
  deps: SharedDeps,
): WiredCustomerApplicationServices {
  const repository = createCustomerRepositoryFromSharedDeps(deps);
  const transactionRunner = createCustomerTransactionRunner(deps);

  const getCustomerById = new GetCustomerByIdService(repository);
  const listCustomers = new ListCustomersService(repository);
  const createCustomer = new CreateCustomerService(transactionRunner);
  const updateCustomer = new UpdateCustomerService(transactionRunner);
  const deleteCustomer = new DeleteCustomerService(transactionRunner);

  return {
    getCustomerById,
    listCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    customerService: new CustomerService(
      getCustomerById,
      listCustomers,
      createCustomer,
      updateCustomer,
      deleteCustomer,
    ),
  };
}
