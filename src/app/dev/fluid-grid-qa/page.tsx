import { PageContainer, AppGrid, AppGridItem } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Development-only fluid grid harness.
 * Mirrors OCC column spans without business data or auth.
 */
export default function FluidGridQaPage() {
  return (
    <div className="flex h-dvh w-full overflow-hidden bg-app-canvas">
      <aside
        className="hidden w-56 shrink-0 border-r border-border bg-sidebar md:block"
        aria-label="QA sidebar stub"
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center border-b border-border px-4 text-sm text-muted-foreground">
          Fluid grid QA
        </header>
        <main id="main-content" className="min-h-0 flex-1 overflow-y-auto">
          <PageContainer className="space-y-4">
            <header className="border-b border-border pb-3">
              <h1 className="font-heading text-[length:var(--text-h1)] font-semibold">
                Operations Control Center
              </h1>
              <p className="measure-prose text-sm text-muted-foreground">
                Layout harness — verify fluid workspace (not a centered 1600px canvas).
              </p>
            </header>

            <section aria-label="Today">
              <h2 className="mb-2 text-[length:var(--text-small)] font-semibold uppercase tracking-wide">
                Today
              </h2>
              <div className="app-grid [&>*]:sm:col-span-3 [&>*]:lg:col-span-3">
                {["Dispatches", "Returns", "Offline", "Alerts"].map((label) => (
                  <Card key={label} size="sm" className="gap-0 py-0">
                    <CardContent className="space-y-0.5 p-3">
                      <p className="font-heading text-2xl font-semibold tabular-nums">12</p>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-[length:var(--text-caption)] text-muted-foreground">
                        Sample metric
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <AppGrid>
              <AppGridItem span={8} smSpan={6}>
                <Card size="sm" className="gap-0 py-0">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold">Needs Attention (8/12)</p>
                    <p className="text-[length:var(--text-caption)] text-muted-foreground">
                      Secondary operational list area
                    </p>
                  </CardContent>
                </Card>
              </AppGridItem>
              <AppGridItem span={4} smSpan={6} as="aside">
                <Card size="sm" className="gap-0 py-0">
                  <CardContent className="p-3">
                    <p className="text-sm font-semibold">Quick Actions (4/12)</p>
                  </CardContent>
                </Card>
              </AppGridItem>
            </AppGrid>

            <section aria-label="Business health">
              <h2 className="mb-2 text-[length:var(--text-small)] font-semibold uppercase tracking-wide">
                Business health
              </h2>
              <div className="app-grid [&>*]:sm:col-span-3 [&>*]:lg:col-span-3">
                {["Revenue", "Cash", "Rentals", "Collections"].map((label) => (
                  <Card key={label} size="sm" className="gap-0 py-0">
                    <CardContent className="space-y-0.5 p-3">
                      <p className="font-heading text-2xl font-semibold tabular-nums">
                        1,240
                      </p>
                      <p className="text-sm font-medium">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <section aria-label="Inventory health">
              <h2 className="mb-2 text-[length:var(--text-small)] font-semibold uppercase tracking-wide">
                Inventory health
              </h2>
              <div className="app-grid [&>*]:sm:col-span-2 [&>*]:lg:col-span-4">
                {["On hand", "Committed", "Available"].map((label) => (
                  <Card key={label} size="sm" className="gap-0 py-0">
                    <CardContent className="space-y-0.5 p-3">
                      <p className="font-heading text-2xl font-semibold tabular-nums">88</p>
                      <p className="text-sm font-medium">{label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </PageContainer>
        </main>
      </div>
    </div>
  );
}
