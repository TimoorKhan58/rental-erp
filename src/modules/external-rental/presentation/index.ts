export {
  handleAllocateExternalRental,
  handleCancelExternalRental,
  handleConfirmExternalRental,
  handleCreateExternalRental,
  handleGetExternalRentalById,
  handleListExternalRentals,
  handleReceiveExternalRental,
  handleSettleExternalRental,
  handleSupplierReturnExternalRental,
} from "./routes/external-rental-api.routes";
export {
  runExternalRentalApiRoute,
  toJsonResponse,
} from "./http/external-rental-api.route-runner";
export { EXTERNAL_RENTAL_ROUTES } from "./routes/external-rental.routes";
