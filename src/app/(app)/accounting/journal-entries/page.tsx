import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { JournalEntryListPage } from "@/features/accounting";

export default function JournalEntriesRoute() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <JournalEntryListPage />
    </Suspense>
  );
}
