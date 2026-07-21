import type { ReactNode } from "react";
import { TentIcon } from "lucide-react";
import { APPLICATION } from "@/constants/application";
import { ThemeToggle } from "@/components/shared/theme-toggle";

type AuthLayoutProps = {
  children: ReactNode;
  organizationName: string;
};

export function AuthLayout({ children, organizationName }: AuthLayoutProps) {
  return (
    <main className="flex min-h-screen bg-background">
      <aside
        aria-hidden="true"
        className="bg-brand-panel relative hidden w-[45%] max-w-xl flex-col justify-between overflow-hidden border-r border-border p-10 lg:flex xl:max-w-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background">
            <TentIcon className="size-5" aria-hidden="true" />
          </div>
          <span className="font-heading text-lg font-semibold text-foreground">
            {APPLICATION.name}
          </span>
        </div>

        <div className="space-y-6">
          <blockquote className="space-y-4">
            <p className="font-heading text-3xl leading-snug font-semibold tracking-tight text-foreground">
              Manage rentals, inventory &amp; finances in one place.
            </p>
            <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
              Streamline orders, dispatch, payments, and reporting for{" "}
              {organizationName}.
            </p>
          </blockquote>

          <div className="flex gap-6 text-xs text-muted-foreground">
            <div>
              <p className="font-heading text-lg font-semibold text-chart-2">360°</p>
              <p>Operations view</p>
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-chart-2">Real-time</p>
              <p>Inventory tracking</p>
            </div>
            <div>
              <p className="font-heading text-lg font-semibold text-chart-2">PKR</p>
              <p>Financial reports</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {organizationName}
        </p>
      </aside>

      <div className="relative flex flex-1 flex-col items-center justify-center bg-card p-6 sm:p-10">
        <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}
