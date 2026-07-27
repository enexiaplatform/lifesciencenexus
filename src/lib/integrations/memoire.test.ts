import { describe, expect, it } from "vitest";

import type { MemoireHandoffPayload } from "./memoire";
import {
  buildMemoireHandoff,
  DEFAULT_VISIBILITY_WARNING,
  FIELD_OBSERVATION_CONTRACT_VERSION,
  fieldObservationPayloadSchema,
  handoffPayloadSchema,
  MEMOIRE_HANDOFF_CONTRACT_VERSION,
  parseFieldObservationPayload,
  parseMemoireHandoff,
} from "./memoire";

/** Golden fixture: the canonical example of a valid nexus-handoff/v1 payload. */
const GOLDEN_HANDOFF: MemoireHandoffPayload = {
  contractVersion: "nexus-handoff/v1",
  handoffId: "ho-001",
  sentAt: "2026-07-01T09:00:00Z",
  source: {
    system: "life_science_nexus",
    tenantId: "tenant-1",
    entityUrl: "https://nexus.example.com/organizations/org-1",
  },
  entity: {
    nexusEntityId: "org-1",
    entityType: "organization",
    displayName: "VietLab Distribution JSC",
    summary: "Authorized distributor for Merck microbiology media in Vietnam.",
    keyFacts: { country: "VN", relationship: "authorized_distributor", since: "2019" },
    evidenceRefs: [
      {
        claimId: "claim-1",
        sourceId: "src-1",
        sourceType: "manufacturer_website",
        evidenceState: "analyst_reviewed",
      },
    ],
  },
  visibilityWarning: "Contains tenant-private commercial intelligence. Do not redistribute.",
  suggestedAction: { kind: "create_account", label: "Create account in Memoire" },
  deepLinkPlaceholder: "{memoire_account_url}",
} as const;

describe("handoffPayloadSchema", () => {
  it("validates the golden fixture", () => {
    expect(handoffPayloadSchema.parse(GOLDEN_HANDOFF)).toEqual(GOLDEN_HANDOFF);
  });

  it("rejects unknown contract versions", () => {
    expect(() => parseMemoireHandoff({ ...GOLDEN_HANDOFF, contractVersion: "nexus-handoff/v2" })).toThrow();
    expect(() => parseMemoireHandoff({ ...GOLDEN_HANDOFF, contractVersion: "nexus-field-observation/v1" })).toThrow();
  });

  it("rejects extra keys and invalid enum values", () => {
    expect(() =>
      parseMemoireHandoff({ ...GOLDEN_HANDOFF, unexpected: "field" }),
    ).toThrow();
    const badRef = {
      ...GOLDEN_HANDOFF,
      entity: {
        ...GOLDEN_HANDOFF.entity,
        evidenceRefs: [{ sourceId: "src-1", sourceType: "telegram_chat", evidenceState: "analyst_reviewed" }],
      },
    };
    expect(() => parseMemoireHandoff(badRef)).toThrow();
  });
});

describe("buildMemoireHandoff", () => {
  const input = {
    tenantId: "tenant-1",
    entityUrl: "https://nexus.example.com/organizations/org-1",
    entity: GOLDEN_HANDOFF.entity,
    suggestedAction: GOLDEN_HANDOFF.suggestedAction,
  };

  it("builds a contract-valid payload (round-trips through the schema)", () => {
    const payload = buildMemoireHandoff(input);
    expect(parseMemoireHandoff(payload)).toEqual(payload);
    expect(payload.contractVersion).toBe(MEMOIRE_HANDOFF_CONTRACT_VERSION);
    expect(payload.visibilityWarning).toBe(DEFAULT_VISIBILITY_WARNING);
  });

  it("is deterministic with injected id and clock", () => {
    const a = buildMemoireHandoff({ ...input, handoffId: "ho-fixed", now: "2026-07-01T09:00:00Z" });
    const b = buildMemoireHandoff({ ...input, handoffId: "ho-fixed", now: "2026-07-01T09:00:00Z" });
    expect(a).toEqual(b);
    expect(a.sentAt).toBe("2026-07-01T09:00:00Z");
  });

  it("rejects invalid builder input instead of emitting a broken payload", () => {
    expect(() =>
      buildMemoireHandoff({ ...input, entity: { ...input.entity, displayName: "" } }),
    ).toThrow();
  });
});

describe("fieldObservationPayloadSchema", () => {
  const GOLDEN_OBSERVATION = {
    contractVersion: "nexus-field-observation/v1",
    observationId: "obs-1",
    tenantId: "tenant-1",
    observedAt: "2026-06-28T14:30:00Z",
    observerId: "user-9",
    observationType: "price",
    payload: { skuId: "sku-1", quotedAmount: "1250000", currency: "VND" },
    visibility: "tenant_private",
    reviewStatus: "unverified",
    notes: "Quoted during site visit.",
  } as const;

  it("validates the golden fixture", () => {
    expect(fieldObservationPayloadSchema.parse(GOLDEN_OBSERVATION)).toEqual(GOLDEN_OBSERVATION);
  });

  it("enforces tenant-private + unverified (observations can never arrive as facts)", () => {
    expect(() => parseFieldObservationPayload({ ...GOLDEN_OBSERVATION, visibility: "canonical" })).toThrow();
    expect(() => parseFieldObservationPayload({ ...GOLDEN_OBSERVATION, reviewStatus: "analyst_reviewed" })).toThrow();
  });

  it("rejects unknown versions and observation types", () => {
    expect(() => parseFieldObservationPayload({ ...GOLDEN_OBSERVATION, contractVersion: "v0" })).toThrow();
    expect(() => parseFieldObservationPayload({ ...GOLDEN_OBSERVATION, observationType: "rumor" })).toThrow();
  });

  it("exposes the contract version constants", () => {
    expect(FIELD_OBSERVATION_CONTRACT_VERSION).toBe("nexus-field-observation/v1");
    expect(MEMOIRE_HANDOFF_CONTRACT_VERSION).toBe("nexus-handoff/v1");
  });
});
