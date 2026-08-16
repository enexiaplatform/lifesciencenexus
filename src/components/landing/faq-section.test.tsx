import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FaqSection } from "./faq-section";

describe("FaqSection", () => {
  it("renders seven questions", () => {
    render(<FaqSection />);

    expect(screen.getAllByRole("group")).toHaveLength(7);
    expect(
      screen.getByText("What data does the graph contain?"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("How is pricing structured?"),
    ).toBeInTheDocument();
  });

  it("uses native details/summary elements", () => {
    const { container } = render(<FaqSection />);

    expect(container.querySelectorAll("details")).toHaveLength(7);
    expect(container.querySelectorAll("summary")).toHaveLength(7);
  });

  it("is reachable by its section id and labelled heading", () => {
    const { container } = render(<FaqSection />);

    expect(container.querySelector("section#faq")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Questions buyers ask first" }),
    ).toBeInTheDocument();
  });
});
