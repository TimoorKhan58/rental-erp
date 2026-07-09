export {
  handleCreateWarehouse,
  handleDeleteWarehouse,
  handleGetWarehouseById,
  handleListWarehouses,
  handleUpdateWarehouse,
} from "./routes/warehouse-api.routes";
export {
  runWarehouseApiRoute,
  toJsonResponse,
  type WarehouseApiRouteOptions,
} from "./http/warehouse-api.route-runner";
export {
  toWarehouseListResponse,
  toWarehouseResponse,
  type WarehouseListResponse,
  type WarehouseResponse,
} from "./mappers/warehouse-response.mapper";
export { WAREHOUSE_ROUTES, type WarehouseRouteKey } from "./routes/warehouse.routes";
