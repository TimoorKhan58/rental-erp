import { ExpenseEditPage } from "@/features/expense";

type ExpenseEditRouteProps = {
  params: Promise<{ expenseId: string }>;
};

export default async function ExpenseEditRoute({ params }: ExpenseEditRouteProps) {
  const { expenseId } = await params;
  return <ExpenseEditPage expenseId={expenseId} />;
}
