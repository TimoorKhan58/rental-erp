import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CustomerProfileCard } from "./customer-profile-card";
import type { CustomerResponse } from "../types";

const customer = {
  id: "c1",
  customerCode: "CUS-0001",
  name: "Ali Raza",
  phone: "0300 1234567",
  cnic: null,
  address: "Lahore",
  notes: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} as CustomerResponse;

describe("CustomerProfileCard actions (UI redesign)", () => {
  it("offers New order, WhatsApp and Edit up front, with the rest under More", () => {
    render(<CustomerProfileCard customer={customer} canUpdate canDelete canCreateOrder />);
    expect(screen.getByRole("link", { name: "New order" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/923001234567",
    );
    expect(screen.getByRole("link", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  });

  it("hides what the person may not do", () => {
    render(<CustomerProfileCard customer={customer} canUpdate={false} canDelete={false} />);
    expect(screen.queryByRole("link", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New order" })).not.toBeInTheDocument();
  });
});
