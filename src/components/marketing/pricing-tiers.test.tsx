import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PlanComparison } from "./plan-comparison";
import { PricingTiers } from "./pricing-tiers";

describe("PricingTiers", () => {
  it("renders the three tiers", () => {
    render(<PricingTiers />);

    expect(
      screen.getByRole("heading", { name: "Demo" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Professional" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Enterprise" }),
    ).toBeInTheDocument();
  });

  it("marks Professional as most popular and links every CTA", () => {
    render(<PricingTiers />);

    expect(screen.getByText("Most popular")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Open demo/ }),
    ).toHaveAttribute("href", "/dashboard");
    expect(
      screen.getByRole("link", { name: /Request access/ }),
    ).toHaveAttribute("href", "/contact");
    expect(
      screen.getByRole("link", { name: /Contact sales/ }),
    ).toHaveAttribute("href", "/contact");
  });
});

describe("PlanComparison", () => {
  it("renders a table whose header cells are scoped to columns", () => {
    render(<PlanComparison />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThanOrEqual(4);
    for (const header of headers) {
      expect(header).toHaveAttribute("scope", "col");
    }
    expect(
      screen.getByRole("columnheader", { name: "Feature" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Professional" }),
    ).toBeInTheDocument();
  });

  it("gives check and minus marks text alternatives", () => {
    render(<PlanComparison />);

    expect(
      screen.getAllByText("Included in Enterprise").length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("Not included in Demo").length,
    ).toBeGreaterThan(0);
  });
});
