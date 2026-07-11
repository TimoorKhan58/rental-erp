import { AuditDetailPage } from "@/features/audit";

type AuditDetailRouteProps = {
  params: Promise<{ auditId: string }>;
};

export default async function AuditDetailRoute({ params }: AuditDetailRouteProps) {
  const { auditId } = await params;
  return <AuditDetailPage auditId={auditId} />;
}
