import { z } from "zod";

import type { NexusRepository } from "@/lib/data/repository";
import {
  assertAtlasVendorNeutrality,
  atlasApplicationSummarySchema,
  atlasMethodSummarySchema,
  atlasOrganismSummarySchema,
  atlasProductSummarySchema,
  atlasStandardSummarySchema,
  atlasSupplierSummarySchema,
  ATLAS_READ_CONTRACT_VERSION,
} from "@/lib/integrations/atlas";

/**
 * Atlas read-contract endpoints (nexus-atlas-read/v1).
 *
 * Canonical reference data only — tenant-private records never leave through
 * these endpoints. Every item is validated against its DTO schema, and the
 * whole payload passes `assertAtlasVendorNeutrality`, which strips any
 * price/commercial/equivalence field that ever sneaks in (Atlas
 * selectsVendor=false, assertsProductEquivalence=false — Nexus never sends
 * prices or equivalence verdicts to Atlas).
 */

export interface AtlasResponse<T> {
  contractVersion: typeof ATLAS_READ_CONTRACT_VERSION;
  data: T[];
  /** Dotted paths stripped by the vendor-neutrality guard (should be empty). */
  strippedFields: string[];
}

type AtlasKind = "products" | "standards" | "applications" | "organisms" | "suppliers" | "methods";

async function collectProducts(repo: NexusRepository): Promise<unknown[]> {
  const products = await repo.list("product", { pageSize: 100, filters: { visibility: "canonical" } });
  const out: unknown[] = [];
  for (const product of products.items) {
    const family = await repo.getById("product_family", product.familyId);
    const brand = family ? await repo.getById("brand", family.brandId) : null;
    const manufacturer = await repo.getById("organization", product.manufacturerOrganizationId);
    out.push({
      id: product.id,
      name: product.name,
      manufacturerName: manufacturer?.name,
      familyName: family?.name,
      brandName: brand?.name,
      category: product.category,
      status: product.status,
    });
  }
  return out;
}

async function collectStandards(repo: NexusRepository): Promise<unknown[]> {
  const standards = await repo.list("standard", { pageSize: 100, filters: { visibility: "canonical" } });
  const versions = await repo.list("standard_version", { pageSize: 100 });
  const currentByStandard = new Map<string, string>();
  for (const version of versions.items) {
    if (version.status === "current") currentByStandard.set(version.standardId, version.version);
  }
  return standards.items.map((standard) => ({
    id: standard.id,
    body: standard.body,
    code: standard.code,
    title: standard.title,
    currentVersion: currentByStandard.get(standard.id),
  }));
}

async function collectApplications(repo: NexusRepository): Promise<unknown[]> {
  const applications = await repo.list("application", { pageSize: 100, filters: { visibility: "canonical" } });
  return applications.items.map((application) => ({
    id: application.id,
    name: application.name,
    description: application.description,
  }));
}

async function collectOrganisms(repo: NexusRepository): Promise<unknown[]> {
  const organisms = await repo.list("organism", { pageSize: 100, filters: { visibility: "canonical" } });
  return organisms.items.map((organism) => ({
    id: organism.id,
    genus: organism.genus,
    species: organism.species,
    strainCode: organism.strainCode,
    gramReaction: organism.gramReaction,
  }));
}

async function collectSuppliers(repo: NexusRepository): Promise<unknown[]> {
  const profiles = await repo.list("supplier_profile", { pageSize: 100, filters: { visibility: "canonical" } });
  const out: unknown[] = [];
  for (const profile of profiles.items) {
    const organization = await repo.getById("organization", profile.organizationId);
    // Reference data only: skip suppliers whose org record is not canonical.
    if (!organization || organization.visibility !== "canonical") continue;
    const manufacturers: string[] = [];
    for (const manufacturerId of profile.manufacturers) {
      const manufacturer = await repo.getById("organization", manufacturerId);
      if (manufacturer && manufacturer.visibility === "canonical") manufacturers.push(manufacturer.name);
    }
    out.push({
      id: profile.id,
      name: organization.name,
      countries: profile.countries,
      manufacturers,
    });
  }
  return out;
}

async function collectMethods(repo: NexusRepository): Promise<unknown[]> {
  const methods = await repo.list("method", { pageSize: 100, filters: { visibility: "canonical" } });
  const out: unknown[] = [];
  for (const method of methods.items) {
    const standardCodes: string[] = [];
    for (const standardId of method.standardIds ?? []) {
      const standard = await repo.getById("standard", standardId);
      if (standard) standardCodes.push(`${standard.body} ${standard.code}`);
    }
    out.push({
      id: method.id,
      name: method.name,
      description: method.description,
      standardCodes,
    });
  }
  return out;
}

const COLLECTORS: Record<AtlasKind, { collect: (repo: NexusRepository) => Promise<unknown[]>; schema: z.ZodTypeAny }> = {
  products: { collect: collectProducts, schema: atlasProductSummarySchema },
  standards: { collect: collectStandards, schema: atlasStandardSummarySchema },
  applications: { collect: collectApplications, schema: atlasApplicationSummarySchema },
  organisms: { collect: collectOrganisms, schema: atlasOrganismSummarySchema },
  suppliers: { collect: collectSuppliers, schema: atlasSupplierSummarySchema },
  methods: { collect: collectMethods, schema: atlasMethodSummarySchema },
};

/**
 * Build the canonical, vendor-neutral Atlas payload for one endpoint.
 * Throws when our own data violates the DTO contract (a bug, surfaced as 500).
 */
export async function buildAtlasResponse(repo: NexusRepository, kind: AtlasKind): Promise<AtlasResponse<unknown>> {
  const { collect, schema } = COLLECTORS[kind];
  const raw = await collect(repo);
  const validated = raw.map((item, index) => {
    const parsed = schema.safeParse(item);
    if (!parsed.success) {
      throw new Error(`atlas ${kind} item ${index} failed DTO validation: ${parsed.error.message}`);
    }
    return parsed.data as unknown;
  });
  const { sanitized, strippedFields } = assertAtlasVendorNeutrality(validated);
  return {
    contractVersion: ATLAS_READ_CONTRACT_VERSION,
    data: sanitized,
    strippedFields,
  };
}
