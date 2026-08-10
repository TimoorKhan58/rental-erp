import { ExpenseDetailPage } from "@/features/expense";

type ExpenseDetailRouteProps = {
  params: Promise<{ expenseId: string }>;
};

export default async function ExpenseDetailRoute({ params }: ExpenseDetailRouteProps) {
  const { expenseId } = await params;
  return <ExpenseDetailPage expenseId={expenseId} />;
}
