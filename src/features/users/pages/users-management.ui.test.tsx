import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "../types";

const mockPush = vi.fn();
const mockActivate = vi.fn();
const mockDeactivate = vi.fn();
const mockResetPassword = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/users",
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

vi.mock("../hooks", async () => {
  const actual = await vi.importActual<typeof import("../hooks")>("../hooks");
  return {
    ...actual,
    useUsersPermissions: vi.fn(),
    useUsers: vi.fn(),
    useRoles: vi.fn(),
    useUserListParams: vi.fn(),
    useUser: vi.fn(),
    useActivateUser: vi.fn(),
    useDeactivateUser: vi.fn(),
    useResetUserPassword: vi.fn(),
  };
});

import {
  useActivateUser,
  useDeactivateUser,
  useResetUserPassword,
  useRoles,
  useUser,
  useUserListParams,
  useUsers,
  useUsersPermissions,
} from "../hooks";
import { UserListPage } from "../pages/user-list-page";
import { UserDetailPage } from "../pages/user-detail-page";
import { UserProfileCard } from "../components/user-profile-card";
import { ResetUserPasswordDialog } from "../dialogs/reset-user-password-dialog";
import { ToggleUserStatusDialog } from "../dialogs/toggle-user-status-dialog";

const sampleUser: UserResponse = {
  id: "00000000-0000-4000-8000-000000000002",
  name: "Grace Hopper",
  email: "grace@example.com",
  roleId: "role-manager",
  role: "manager",
  isActive: false,
  createdAt: "2026-01-03T00:00:00.000Z",
  updatedAt: "2026-01-04T00:00:00.000Z",
};

function renderWithProviders(ui: ReactElement) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe("Users management UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useUserListParams).mockReturnValue({
      params: { page: 1, pageSize: 20, sortOrder: "desc" },
      localSearch: "",
      setLocalSearch: vi.fn(),
      setSearch: vi.fn(),
      setPage: vi.fn(),
      setPageSize: vi.fn(),
      setStatusFilter: vi.fn(),
      setRoleFilter: vi.fn(),
      setSorting: vi.fn(),
      refreshKey: "",
    });

    vi.mocked(useUsers).mockReturnValue({
      data: {
        items: [sampleUser],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as never);

    vi.mocked(useRoles).mockReturnValue({
      data: [{ id: "role-manager", name: "manager", label: "Manager" }],
      isLoading: false,
    } as never);

    vi.mocked(useUser).mockReturnValue({
      data: sampleUser,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as never);

    vi.mocked(useActivateUser).mockReturnValue({
      mutateAsync: mockActivate,
      isPending: false,
    } as never);

    vi.mocked(useDeactivateUser).mockReturnValue({
      mutateAsync: mockDeactivate,
      isPending: false,
    } as never);

    vi.mocked(useResetUserPassword).mockReturnValue({
      mutateAsync: mockResetPassword,
      isPending: false,
    } as never);
  });

  it("shows access denied when identity:read is missing", () => {
    vi.mocked(useUsersPermissions).mockReturnValue({
      isLoading: false,
      canRead: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    });

    renderWithProviders(<UserListPage />);

    expect(
      screen.getByText(/you do not have permission to view user accounts/i),
    ).toBeVisible();
  });

  it("shows New user when identity:create is granted", () => {
    vi.mocked(useUsersPermissions).mockReturnValue({
      isLoading: false,
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    });

    renderWithProviders(<UserListPage />);

    expect(screen.getByRole("heading", { name: "Users" })).toBeVisible();
    expect(screen.getByRole("link", { name: /new user/i })).toHaveAttribute(
      "href",
      "/users/new",
    );
    expect(screen.getByRole("link", { name: "Grace Hopper" })).toHaveAttribute(
      "href",
      `/users/${sampleUser.id}`,
    );
  });

  it("shows activate and reset password actions on the profile card", () => {
    const onToggleStatus = vi.fn();
    const onResetPassword = vi.fn();

    renderWithProviders(
      <UserProfileCard
        user={sampleUser}
        canUpdate
        canDelete
        onToggleStatus={onToggleStatus}
        onResetPassword={onResetPassword}
      />,
    );

    expect(screen.getByRole("button", { name: /activate/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /^edit$/i })).toHaveAttribute(
      "href",
      `/users/${sampleUser.id}/edit`,
    );
  });

  it("activates a user from the confirmation dialog", async () => {
    const user = userEvent.setup();
    mockActivate.mockResolvedValue({ ...sampleUser, isActive: true });
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ToggleUserStatusDialog user={sampleUser} open onOpenChange={onOpenChange} />,
    );

    await user.click(screen.getByRole("button", { name: /^activate$/i }));

    await waitFor(() => {
      expect(mockActivate).toHaveBeenCalledWith(sampleUser.id);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("resets a password through the dialog form", async () => {
    const user = userEvent.setup();
    mockResetPassword.mockResolvedValue(sampleUser);
    const onOpenChange = vi.fn();

    renderWithProviders(
      <ResetUserPasswordDialog user={sampleUser} open onOpenChange={onOpenChange} />,
    );

    const passwordInput = document.querySelector<HTMLInputElement>(
      'input[name="password"]',
    );
    const confirmInput = document.querySelector<HTMLInputElement>(
      'input[name="confirmPassword"]',
    );

    expect(passwordInput).not.toBeNull();
    expect(confirmInput).not.toBeNull();

    await user.type(passwordInput!, "Password123!");
    await user.type(confirmInput!, "Password123!");
    await user.click(screen.getByRole("button", { name: /^reset password$/i }));

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith({
        id: sampleUser.id,
        payload: { password: "Password123!" },
      });
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("renders detail page fields and actions", () => {
    vi.mocked(useUsersPermissions).mockReturnValue({
      isLoading: false,
      canRead: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    });

    renderWithProviders(<UserDetailPage userId={sampleUser.id} />);

    expect(screen.getByRole("heading", { name: "Grace Hopper" })).toBeVisible();
    expect(screen.getAllByText("grace@example.com").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /activate/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /reset password/i })).toBeVisible();
  });
});
