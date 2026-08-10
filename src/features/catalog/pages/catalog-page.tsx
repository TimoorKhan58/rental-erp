"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ROUTES } from "@/config/routes";
import { CatalogEntityPanel } from "../components";
import { CATALOG_TAB_LABELS } from "../mappers";
import { CATALOG_TABS, type CatalogTab } from "../types";

function isCatalogTab(value: string | null): value is CatalogTab {
  return CATALOG_TABS.includes(value as CatalogTab);
}

export function CatalogPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeTab = useMemo<CatalogTab>(() => {
    const tab = searchParams.get("tab");
    return isCatalogTab(tab) ? tab : "categories";
  }, [searchParams]);

  const handleTabChange = (value: string | null) => {
    if (!isCatalogTab(value)) return;
    const next = new URLSearchParams(searchParams.toString());
    if (value === "categories") {
      next.delete("tab");
    } else {
      next.set("tab", value);
    }
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <PageContainer className="space-y-6">
      <PageHeader
        title="Catalog"
        description="Manage categories, brands, units, attributes, and tags used by products."
        breadcrumbs={[
          { label: "Dashboard", href: ROUTES.dashboard },
          { label: "Catalog" },
        ]}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList
          variant="line"
          className="w-full justify-start overflow-x-auto"
          aria-label="Catalog sections"
        >
          {CATALOG_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {CATALOG_TAB_LABELS[tab]}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATALOG_TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-6">
            <CatalogEntityPanel tab={tab} />
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  );
}
