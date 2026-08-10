import { Suspense } from "react";
import { LoadingState } from "@/components/feedback";
import { ExpenseListPage } from "@/features/expense";

export default function ExpensesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading..." />}>
      <ExpenseListPage />
    </Suspense>
  );
}
