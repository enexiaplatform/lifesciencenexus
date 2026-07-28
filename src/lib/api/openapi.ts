/**
 * Hand-written OpenAPI 3.1 document for API v1.
 *
 * Compact but accurate: every public path, its query parameters, the success
 * envelope ({data, meta}) and the error contract ({error:{code,message,
 * details?}}), plus the apiKey security scheme. Served at
 * GET /api/v1/openapi.json. Keep in sync when endpoints change.
 */

const errorContract = {
  type: "object",
  required: ["error"],
  properties: {
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: {
          type: "string",
          enum: ["bad_request", "unauthorized", "not_found", "unprocessable", "rate_limited", "internal_error"],
        },
        message: { type: "string" },
        details: {},
      },
    },
  },
} as const;

const successEnvelope = (dataSchema: object) => ({
  type: "object",
  required: ["data"],
  properties: {
    data: dataSchema,
    meta: {
      type: "object",
      properties: {
        page: { type: "integer" },
        pageSize: { type: "integer" },
        total: { type: "integer" },
        totalPages: { type: "integer" },
      },
    },
  },
});

const errorResponses = {
  "400": { description: "Invalid query parameters", content: { "application/json": { schema: errorContract } } },
  "401": { description: "Missing or invalid API key", content: { "application/json": { schema: errorContract } } },
  "404": { description: "Not found", content: { "application/json": { schema: errorContract } } },
  "429": { description: "Rate limit exceeded (Retry-After header set)", content: { "application/json": { schema: errorContract } } },
  "500": { description: "Internal error", content: { "application/json": { schema: errorContract } } },
} as const;

const paginationParams = [
  { name: "page", in: "query", schema: { type: "integer", default: 1 } },
  { name: "pageSize", in: "query", schema: { type: "integer", default: 25, maximum: 100 } },
  { name: "sort", in: "query", schema: { type: "string" }, description: "Whitelisted sort field (per endpoint)" },
  { name: "order", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
] as const;

const queryParam = (name: string, description: string, schema: object = { type: "string" }) => ({
  name,
  in: "query" as const,
  description,
  schema,
});

const listGet = (summary: string, entity: string, extraParams: object[] = []) => ({
  get: {
    summary,
    parameters: [...paginationParams, ...extraParams],
    responses: {
      "200": {
        description: "Paginated list",
        content: {
          "application/json": {
            schema: successEnvelope({ type: "array", items: { type: "object", description: entity } }),
          },
        },
      },
      ...errorResponses,
    },
  },
});

const detailGet = (summary: string, entity: string) => ({
  get: {
    summary,
    parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
    responses: {
      "200": {
        description: entity,
        content: { "application/json": { schema: successEnvelope({ type: "object" }) } },
      },
      ...errorResponses,
    },
  },
});

const atlasGet = (summary: string) => ({
  get: {
    summary,
    description:
      "Canonical reference data only (nexus-atlas-read/v1). Vendor-neutral: never contains prices, commercial terms or equivalence verdicts (assertAtlasVendorNeutrality strips them).",
    responses: {
      "200": {
        description: "Atlas read-contract payload",
        content: {
          "application/json": {
            schema: successEnvelope({
              type: "object",
              required: ["contractVersion", "data"],
              properties: {
                contractVersion: { type: "string", enum: ["nexus-atlas-read/v1"] },
                data: { type: "array", items: { type: "object" } },
                strippedFields: { type: "array", items: { type: "string" } },
              },
            }),
          },
        },
      },
      ...errorResponses,
    },
  },
});

export function buildOpenApiDocument(): Record<string, unknown> {
  return {
    openapi: "3.1.0",
    info: {
      title: "Life Science Nexus API",
      version: "1.0.0",
      description:
        "Read API for the Nexus intelligence graph. Success envelope: {data, meta}; error contract: {error:{code,message,details?}}. " +
        "Auth: x-api-key (when NEXUS_API_KEY is configured; otherwise demo mode allows keyless access). " +
        "Tenant-private data requires the x-nexus-tenant header of the owning tenant (demo: tenant_demo). " +
        "Rate limit: 60 req/min per key+route (per instance).",
    },
    servers: [{ url: "/api/v1" }],
    components: {
      securitySchemes: {
        apiKey: { type: "apiKey", in: "header", name: "x-api-key" },
      },
      schemas: { Error: errorContract },
    },
    security: [{ apiKey: [] }],
    paths: {
      "/search": listGet("Federated search across name-bearing entities (results include score and matchReasons)", "SearchResult", [
        queryParam("q", "Search text (required)"),
        queryParam("types", "Comma-separated entity types to restrict to"),
        queryParam("limit", "Max results (1-50, default 20)", { type: "integer" }),
      ]),
      "/organizations": listGet("List organizations", "Organization", [
        queryParam("q", "Name filter"),
        queryParam("country", "ISO alpha-2"),
        queryParam("type", "Organization role (manufacturer, distributor, ...)"),
      ]),
      "/organizations/{id}": detailGet("Organization aggregate (aliases, sites, laboratories, supplier profile, contacts, relationships)", "OrganizationDetail"),
      "/products": listGet("List products", "Product", [
        queryParam("q", "Name filter"),
        queryParam("category", "Product category"),
        queryParam("status", "active|discontinued|unknown"),
        queryParam("familyId", "Product family id"),
        queryParam("manufacturerOrganizationId", "Manufacturer org id"),
      ]),
      "/products/{id}": detailGet("Product aggregate (family, brand, manufacturer, skus, edges, documents)", "ProductDetail"),
      "/skus/{id}": detailGet("Full SKU detail (packs, listings, prices, documents)", "SkuDetail"),
      "/sites/{id}": detailGet("Site with parent organization name", "Site"),
      "/standards": listGet("List standards", "Standard", [
        queryParam("q", "Code/title filter"),
        queryParam("body", "ISO|USP|EP|JP|AOAC|TCVN|other"),
        queryParam("includeVersions", "true to inline standard versions", { type: "string", enum: ["true", "false"] }),
      ]),
      "/applications": listGet("List applications", "Application", [queryParam("q", "Name filter")]),
      "/suppliers": listGet("List supplier profiles (joined with organization names)", "SupplierProfile", [
        queryParam("relationshipType", "authorized_distributor|non_exclusive_distributor|dealer|reseller|importer|service_provider|unknown_unverified"),
        queryParam("country", "ISO alpha-2 country served"),
      ]),
      "/prices": listGet("List price observations (tenant_private rows only for the owning tenant)", "PriceObservation", [
        queryParam("sku", "SKU id"),
        queryParam("currency", "ISO 4217"),
        queryParam("visibility", "canonical|tenant_private (clamped to canonical for anonymous callers)"),
        queryParam("supplierOrgId", "Supplier organization id"),
      ]),
      "/tenders": listGet("List tenders", "Tender", [
        queryParam("q", "Code/title filter"),
        queryParam("status", "published|closed|awarded|cancelled|unknown"),
        queryParam("country", "ISO alpha-2"),
      ]),
      "/tenders/{id}": detailGet("Tender aggregate (buyer, lots, items, bidders, awards, events)", "TenderDetail"),
      "/installed-assets": listGet("List installed assets (tenant-private; empty page for anonymous callers)", "InstalledAsset", [
        queryParam("siteId", "Site id"),
        queryParam("assetModelId", "Asset model id"),
        queryParam("status", "operational|under_maintenance|retired|unknown"),
        queryParam("qualificationStatus", "iq_oq_pq_complete|partial|none|unknown"),
      ]),
      "/signals": listGet("Computed opportunity signals (tenant-private; empty page for anonymous callers)", "OpportunitySignal", [
        queryParam("type", "Signal type"),
        queryParam("status", "new|acknowledged|sent_to_memoire|dismissed"),
      ]),
      "/sources": listGet("List evidence sources", "Source", [
        queryParam("q", "Title filter"),
        queryParam("type", "Source type"),
      ]),
      "/equivalences": listGet("List equivalence records", "EquivalenceRecord", [
        queryParam("classification", "exact_equivalent|functional_equivalent|closest_alternative|not_recommended_substitute"),
        queryParam("skuId", "Records involving this SKU (either side)"),
      ]),
      "/entities/{type}/{id}": {
        get: {
          summary: "Generic entity fetch by type and id",
          parameters: [
            { name: "type", in: "path", required: true, schema: { type: "string" }, description: "Domain entity type (e.g. organization, sku, claim)" },
            { name: "id", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": { description: "The entity", content: { "application/json": { schema: successEnvelope({ type: "object" }) } } },
            ...errorResponses,
          },
        },
      },
      "/integrations/memoire/handoff": {
        post: {
          summary: "Build a nexus-handoff/v1 payload for Memoire and record it (status: prepared)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["entityType", "entityId"],
                  properties: {
                    entityType: {
                      type: "string",
                      enum: ["organization", "site", "person", "product", "sku", "installed_asset", "competitor", "market_signal", "source_summary"],
                    },
                    entityId: { type: "string" },
                    suggestedActionKind: {
                      type: "string",
                      enum: ["create_account", "create_opportunity_note", "add_stakeholder", "log_activity", "review_signal"],
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Contract-valid handoff payload", content: { "application/json": { schema: successEnvelope({ type: "object" }) } } },
            "422": { description: "Body failed validation", content: { "application/json": { schema: errorContract } } },
            ...errorResponses,
          },
        },
      },
      "/integrations/atlas/products": atlasGet("Atlas product summaries"),
      "/integrations/atlas/standards": atlasGet("Atlas standard summaries"),
      "/integrations/atlas/applications": atlasGet("Atlas application summaries"),
      "/integrations/atlas/organisms": atlasGet("Atlas organism summaries"),
      "/integrations/atlas/suppliers": atlasGet("Atlas supplier summaries (reference data, no commercial terms)"),
      "/integrations/atlas/methods": atlasGet("Atlas method summaries"),
      "/openapi.json": {
        get: {
          summary: "This OpenAPI document",
          security: [],
          responses: { "200": { description: "OpenAPI 3.1 JSON" } },
        },
      },
    },
  };
}
