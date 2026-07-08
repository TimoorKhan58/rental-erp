import { APPLICATION } from "@/constants/application";
import {
  AppShell,
  ContentArea,
  PageContainer,
  PageHeader,
} from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <AppShell>
      <PageContainer>
        <PageHeader
          title={APPLICATION.name}
          description="Application shell foundation — modules will be added in future milestones."
          breadcrumbs={[{ label: "Home" }]}
          actions={
            <Button variant="outline" size="sm" disabled>
              Action
            </Button>
          }
        />
        <ContentArea>
          <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
            <p className="text-sm font-medium">Version {APPLICATION.version}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Project Under Development
            </p>
          </div>
        </ContentArea>
      </PageContainer>
    </AppShell>
  );
}
