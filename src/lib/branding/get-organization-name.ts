import { APPLICATION } from "@/constants/application";
import prisma from "@/lib/prisma";
import { createAppLogger } from "@/shared/infrastructure/logging";
import { runAsSystem } from "@/shared/infrastructure/tenancy/organization-scope";

/**
 * Company name for public pages (login, auth layout), shown before anyone
 * signs in. While a single business uses this installation it shows that
 * business's name; with several, it shows the product name so no business's
 * name is shown to another's users. It is only a label, so a slow or
 * unavailable database falls back to the app name (QA-017).
 */
export async function getOrganizationName(): Promise<string> {
  try {
    return await runAsSystem("public page branding", async () => {
      const organizations = await prisma.organization.count();

      if (organizations !== 1) {
        return APPLICATION.name;
      }

      const settings = await prisma.companySetting.findFirst({
        where: { isActive: true },
        select: { companyName: true },
        orderBy: { updatedAt: "desc" },
      });

      const companyName = settings?.companyName?.trim();
      return companyName && companyName.length > 0 ? companyName : APPLICATION.name;
    });
  } catch (error) {
    createAppLogger().warn("Company name lookup failed; using app name", {
      error: error instanceof Error ? error.message : String(error),
    });
    return APPLICATION.name;
  }
}
