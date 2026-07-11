import { SemanticBadge } from "@/components/design-system/badge";
import type { RentalReservationFilter } from "../types";
import { RESERVATION_LABELS } from "../mappers";

type RentalReservationBadgeProps = {
  status: RentalReservationFilter;
};

const reservationSemantic: Record<
  RentalReservationFilter,
  "draft" | "warning" | "success"
> = {
  "not-started": "draft",
  partial: "warning",
  complete: "success",
};

export function RentalReservationBadge({ status }: RentalReservationBadgeProps) {
  return (
    <SemanticBadge semantic={reservationSemantic[status]}>
      {RESERVATION_LABELS[status]}
    </SemanticBadge>
  );
}
