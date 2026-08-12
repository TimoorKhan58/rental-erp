import type {
  ExternalRentalAgreementId,
  RentalOrderId,
} from "@/shared/domain/ids";
import type { PaginatedResult } from "@/shared/domain/pagination";

import type { ExternalRentalAgreement } from "./external-rental.entity";
import type { ExternalRentalListQuery } from "./external-rental-list.query";
import type {
  CreateExternalRentalAgreementData,
  UpdateExternalRentalWorkflowData,
} from "./external-rental.types";

/**
 * Persistence port for external rental agreements.
 */
export interface IExternalRentalRepository {
  findById(
    id: ExternalRentalAgreementId,
  ): Promise<ExternalRentalAgreement | null>;
  findByAgreementNumber(
    agreementNumber: string,
  ): Promise<ExternalRentalAgreement | null>;
  /**
   * Active (non-CANCELLED) agreement for a rental order, if any.
   * Enforces BD-4 / BD-C3 claim slot used by create and dispatch/return.
   */
  findActiveByRentalOrderId(
    rentalOrderId: RentalOrderId,
  ): Promise<ExternalRentalAgreement | null>;
  findPaged(
    query: ExternalRentalListQuery,
  ): Promise<PaginatedResult<ExternalRentalAgreement>>;
  create(
    data: CreateExternalRentalAgreementData,
  ): Promise<ExternalRentalAgreement>;
  /**
   * Persist confirm / receive / allocate workflow state (status, money, item counters).
   * Does not touch Inventory or RentalOrderItem.reservedQuantity.
   */
  updateWorkflow(
    id: ExternalRentalAgreementId,
    data: UpdateExternalRentalWorkflowData,
  ): Promise<ExternalRentalAgreement>;
}
