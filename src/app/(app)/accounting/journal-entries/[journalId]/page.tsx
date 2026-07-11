import { JournalEntryDetailPage } from "@/features/accounting";

type JournalEntryDetailRouteProps = {
  params: Promise<{ journalId: string }>;
};

export default async function JournalEntryDetailRoute({
  params,
}: JournalEntryDetailRouteProps) {
  const { journalId } = await params;
  return <JournalEntryDetailPage journalId={journalId} />;
}
