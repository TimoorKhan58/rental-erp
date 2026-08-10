import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsOverviewResponse } from "../types";
import {
  ANALYTICS_METRIC_LABELS,
  ANALYTICS_SCOPE_HINTS,
} from "../constants/analytics-labels";
import { getDefaultAnalyticsDateRange } from "../utils";

const mockRefetch = vi.fn();
const mockSetDateRange = vi.fn();
const defaultRange = getDefaultAnalyticsDateRange(
  new Date("2026-07-15T12:00:00.000Z"),
);

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/reports/analytics",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../hooks", () => ({
  useAnalyticsPermissions: vi.fn(),
  useAnalyticsOverview: vi.fn(),
}));

vi.mock("@/features/financial-report/hooks", () => ({
  useDateRangeParams: () => ({
    params: defaultRange,
    dateFrom: defaultRange.dateFrom,
    dateTo: defaultRange.dateTo,
    setDateRange: mockSetDateRange,
  }),
}));

import {
  useAnalyticsOverview,
  useAnalyticsPermissions,
} from "../hooks";
import { AnalyticsDashboardPage } from "./analytics-dashboard-page";

const sampleOverview: AnalyticsOverviewResponse = {
  period: {
    dateFrom: "2026-07-01T00:00:00.000Z",
    dateTo: "2026-07-31T23:59:59.000Z",
  },
  bookedRentalValue: 1250000,
  billedRevenue: 900000,
  collectedCash: 750000,
  recognizedRevenue: 800000,
  rentals: {
    activeCount: 12,
    upcomingCount: 4,
    overdueCount: 2,
    completedCount: 40,
  },
  financial: { outstandingAR: 150000 },
  inventory: { availableQuantity: 320, reservedQuantity: 45 },
  customers: { newCount: 3 },
  procurement: { orderedProcurementValue: 22000 },
  operations: {
    assetsUnderMaintenanceCount: 1,
    rentalMaintenanceJobsOpenCount: 2,
    repairJobsOpenCount: 3,
  },
};

const zeroOverview: AnalyticsOverviewResponse = {
  ...sampleOverview,
  bookedRentalValue: 0,
  billedRevenue: 0,
  collectedCash: 0,
  recognizedRevenue: 0,
  rentals: {
    activeCount: 0,
    upcomingCount: 0,
    overdueCount: 0,
    completedCount: 0,
  },
  financial: { outstandingAR: 0 },
  inventory: { availableQuantity: 0, reservedQuantity: 0 },
  customers: { newCount: 0 },
  procurement: { orderedProcurementValue: 0 },
  operations: {
    assetsUnderMaintenanceCount: 0,
    rentalMaintenanceJobsOpenCount: 0,
    repairJobsOpenCount: 0,
  },
};

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe("AnalyticsDashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAnalyticsPermissions).mockReturnValue({
      isLoading: false,
      canRead: true,
    });
  });

  it("renders qualified KPI labels from a valid overview response", () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: sampleOverview,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
      isFetching: false,
    } as never);

    renderWithProviders(<AnalyticsDashboardPage />);

    expect(
      screen.getByRole("heading", { name: "Analytics" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.bookedRentalValue),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.billedRevenue),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.collectedCash),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.recognizedRevenue),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.outstandingAR),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.activeRentals),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.upcomingRentals),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.overdueRentals),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.availableQuantity),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.reservedQuantity),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.newCustomers),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.orderedProcurementValue),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.assetsUnderMaintenance),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.rentalMaintenanceJobs),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.repairJobs),
    ).toBeInTheDocument();

    expect(screen.queryByText("Paid Invoice Amount")).not.toBeInTheDocument();
    expect(screen.queryByText("Rented Quantity")).not.toBeInTheDocument();
    expect(screen.queryByText("Physically On Rent")).not.toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_SCOPE_HINTS.bookedRentalValueDate),
    ).toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_SCOPE_HINTS.completedRentals),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Date from")).toHaveValue(
      defaultRange.dateFrom,
    );
    expect(screen.getByLabelText("Date to")).toHaveValue(defaultRange.dateTo);
  });

  it("prevents inverted date ranges from being applied", () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: sampleOverview,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
      isFetching: false,
    } as never);

    renderWithProviders(<AnalyticsDashboardPage />);

    fireEvent.change(screen.getByLabelText("Date from"), {
      target: { value: "2026-08-01" },
    });

    expect(mockSetDateRange).not.toHaveBeenCalled();
    expect(
      screen.getByText("Date from must be on or before date to."),
    ).toBeInTheDocument();
  });

  it("renders zero values without treating them as an error", () => {
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: zeroOverview,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
      isFetching: false,
    } as never);

    renderWithProviders(<AnalyticsDashboardPage />);

    expect(
      screen.queryByText("Analytics could not be loaded"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(ANALYTICS_METRIC_LABELS.bookedRentalValue),
    ).toBeInTheDocument();
  });

  it("shows an error state with retry when the API fails", async () => {
    const user = userEvent.setup();
    vi.mocked(useAnalyticsOverview).mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network down"),
      refetch: mockRefetch,
      isFetching: false,
    } as never);

    renderWithProviders(<AnalyticsDashboardPage />);

    expect(
      screen.getByText("Analytics could not be loaded"),
    ).toBeInTheDocument();
    expect(screen.getByText("Network down")).toBeInTheDocument();
    expect(
      screen.queryByText(ANALYTICS_METRIC_LABELS.bookedRentalValue),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(mockRefetch).toHaveBeenCalled();
  });
});
