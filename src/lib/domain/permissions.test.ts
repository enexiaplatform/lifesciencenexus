import { describe, expect, it } from "vitest";

import type { Action } from "./permissions";
import { ACTIONS, can, isCanonicalWriter, isPrivateAllowed, isReviewer, ROLE_PERMISSIONS } from "./permissions";
import { ROLES } from "./types";

describe("can() permission matrix", () => {
  it("owner can do everything", () => {
    for (const action of ACTIONS) {
      expect(can("owner", action)).toBe(true);
    }
  });

  it("admin can do everything in the current action set", () => {
    // Ownership transfer is intentionally NOT an action yet (see module docs);
    // when introduced it must be owner-only.
    for (const action of ACTIONS) {
      expect(can("admin", action)).toBe(true);
    }
  });

  it("analyst: canonical write + review + export, but no admin actions", () => {
    const allowed: Action[] = ["read_canonical", "write_canonical", "write_private", "review_evidence", "export_data"];
    const denied: Action[] = ["publish_to_canonical", "merge_entities", "manage_tenant", "manage_integrations", "dismiss_signals"];
    for (const action of allowed) expect(can("analyst", action)).toBe(true);
    for (const action of denied) expect(can("analyst", action)).toBe(false);
  });

  it("contributor: private write only", () => {
    expect(can("contributor", "read_canonical")).toBe(true);
    expect(can("contributor", "write_private")).toBe(true);
    expect(can("contributor", "export_data")).toBe(true);
    expect(can("contributor", "write_canonical")).toBe(false);
    expect(can("contributor", "review_evidence")).toBe(false);
    expect(can("contributor", "publish_to_canonical")).toBe(false);
  });

  it("reviewer: reviews and publishes, but cannot write canonical content", () => {
    expect(can("reviewer", "read_canonical")).toBe(true);
    expect(can("reviewer", "review_evidence")).toBe(true);
    expect(can("reviewer", "publish_to_canonical")).toBe(true);
    expect(can("reviewer", "export_data")).toBe(true);
    expect(can("reviewer", "write_canonical")).toBe(false);
    expect(can("reviewer", "write_private")).toBe(false);
  });

  it("viewer: canonical read only", () => {
    for (const action of ACTIONS) {
      expect(can("viewer", action)).toBe(action === "read_canonical");
    }
  });

  it("every role has an explicit entry in the matrix", () => {
    for (const role of ROLES) {
      expect(ROLE_PERMISSIONS[role]).toBeInstanceOf(Set);
      expect(ROLE_PERMISSIONS[role].size).toBeGreaterThan(0);
    }
  });
});

describe("helpers", () => {
  it("isPrivateAllowed matches write_private", () => {
    expect(isPrivateAllowed("analyst")).toBe(true);
    expect(isPrivateAllowed("contributor")).toBe(true);
    expect(isPrivateAllowed("viewer")).toBe(false);
    expect(isPrivateAllowed("reviewer")).toBe(false);
  });

  it("isCanonicalWriter and isReviewer mirror the matrix", () => {
    expect(isCanonicalWriter("analyst")).toBe(true);
    expect(isCanonicalWriter("contributor")).toBe(false);
    expect(isReviewer("reviewer")).toBe(true);
    expect(isReviewer("viewer")).toBe(false);
  });
});
