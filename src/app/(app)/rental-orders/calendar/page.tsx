import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { RentalOrderCalendarPage } from "@/features/rental-order";

export default function RentalOrdersCalendarRoutePage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <RentalOrderCalendarPage />
    </Suspense>
  );
}
