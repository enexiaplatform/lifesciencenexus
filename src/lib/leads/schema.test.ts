import { describe, expect, it } from "vitest";

import { leadSchema } from "./schema";

const validPayload = {
  name: "Lan Nguyen",
  email: "lan.nguyen@example.com",
  company: "Delta Pharma QC",
  role: "procurement",
  message: "We want to evaluate Nexus for our QC sourcing workflow.",
} as const;

describe("leadSchema", () => {
  it("accepts a valid payload", () => {
    const result = leadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email address", () => {
    const result = leadSchema.safeParse({
      ...validPayload,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined();
    }
  });

  it("rejects a message shorter than 10 characters", () => {
    const result = leadSchema.safeParse({ ...validPayload, message: "too short" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toBeDefined();
    }
  });

  it("rejects a role outside the enum", () => {
    const result = leadSchema.safeParse({ ...validPayload, role: "intern" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.role).toBeDefined();
    }
  });

  it("accepts boundary-length values (name 2, message 10)", () => {
    const result = leadSchema.safeParse({
      ...validPayload,
      name: "Li",
      message: "1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("rejects values past the upper bounds (name 101, message 2001)", () => {
    const result = leadSchema.safeParse({
      ...validPayload,
      name: "a".repeat(101),
      message: "b".repeat(2001),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.name).toBeDefined();
      expect(errors.message).toBeDefined();
    }
  });

  it("trims surrounding whitespace before validating", () => {
    const result = leadSchema.safeParse({
      ...validPayload,
      name: "  Lan Nguyen  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Lan Nguyen");
    }
  });
});
