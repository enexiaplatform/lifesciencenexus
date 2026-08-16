import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContactForm } from "./contact-form";

describe("ContactForm", () => {
  it("renders every field with an accessible name", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Company")).toBeInTheDocument();
    expect(screen.getByLabelText("Role")).toBeInTheDocument();
    expect(screen.getByLabelText("Message")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Submit request" }),
    ).toBeInTheDocument();
  });

  it("shows per-field validation errors on an empty submit", async () => {
    const { container } = render(<ContactForm />);
    const form = container.querySelector("form");
    expect(form).not.toBeNull();

    fireEvent.submit(form as HTMLFormElement);

    expect(
      await screen.findByText("Enter your full name (at least 2 characters)."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Enter a valid work email address."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Select the role that describes you best."),
    ).toBeInTheDocument();

    // Errors are wired to their controls per the design-system a11y rules.
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(screen.getByLabelText("Name")).toHaveAttribute(
      "aria-describedby",
      "lead-name-error",
    );
  });
});
