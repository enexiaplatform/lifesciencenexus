import { describe, expect, it } from "vitest";

import {
  emailSchema,
  loginSchema,
  passwordSchema,
  resetPasswordSchema,
  signupSchema,
} from "./schemas";

describe("emailSchema", () => {
  it("accepts a valid email", () => {
    expect(emailSchema.safeParse("jane@example.com").success).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("passwordSchema", () => {
  it("accepts 8+ characters", () => {
    expect(passwordSchema.safeParse("12345678").success).toBe(true);
  });

  it("rejects short passwords", () => {
    const result = passwordSchema.safeParse("short");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toMatch(/at least 8/);
    }
  });
});

describe("loginSchema", () => {
  it("accepts email plus any non-empty password", () => {
    expect(
      loginSchema.safeParse({ email: "jane@example.com", password: "x" })
        .success,
    ).toBe(true);
  });

  it("rejects a missing password", () => {
    expect(
      loginSchema.safeParse({ email: "jane@example.com", password: "" })
        .success,
    ).toBe(false);
  });
});

describe("signupSchema", () => {
  const valid = {
    fullName: "Jane Analyst",
    email: "jane@example.com",
    password: "correct horse",
    confirmPassword: "correct horse",
  };

  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects mismatched password confirmation", () => {
    const result = signupSchema.safeParse({
      ...valid,
      confirmPassword: "different horse",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Passwords do not match");
    }
  });

  it("rejects a short password", () => {
    const result = signupSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("requires a name", () => {
    expect(signupSchema.safeParse({ ...valid, fullName: "" }).success).toBe(
      false,
    );
  });
});

describe("resetPasswordSchema", () => {
  it("accepts matching passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "new-password",
        confirmPassword: "new-password",
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "new-password",
        confirmPassword: "other-password",
      }).success,
    ).toBe(false);
  });
});
