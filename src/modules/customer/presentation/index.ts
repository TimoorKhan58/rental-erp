export {
  createCustomerHandler,
  deleteCustomerHandler,
  getCustomerByIdHandler,
  updateCustomerHandler,
  type CustomerRouteHandler,
} from "./handlers/customer.handlers";
export {
  toCustomerResponse,
  type CustomerResponse,
} from "./mappers/customer-response.mapper";
export { CUSTOMER_ROUTES, type CustomerRouteKey } from "./routes/customer.routes";
