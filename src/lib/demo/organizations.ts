import type {
  Address,
  EmploymentRelationship,
  FacilityUnit,
  Geography,
  Laboratory,
  Organization,
  OrganizationAlias,
  OrganizationContact,
  OrganizationRelationship,
  Person,
  ProductionLine,
  Site,
} from "@/lib/domain/types";

import { edgeEvidence, type SeedContext } from "./context";
import {
  ADDRESSES,
  DEMO_TENANT_ID,
  LABS,
  ORGS,
  OTHER_TENANT_ID,
  PEOPLE,
  SITES,
  SOURCES,
} from "./ids";
import type { DemoDatasetSlices } from "./types";

/**
 * Market-actor fixtures: fictional manufacturers, distributors, customers and
 * a tender buyer for the Vietnam industrial-microbiology demo market, plus the
 * sites/laboratories/people needed to map one pharma account end-to-end.
 *
 * Includes the deliberate near-duplicate pair
 * "Mekong Lab Supply (Demo)" ↔ "MeKong Laboratory Supply Co. (Demo)"
 * (shared web domain, shared Thu Duc address, alias overlap) so the
 * entity-resolution engine finds them.
 */
export function seedOrganizations(ctx: SeedContext): DemoDatasetSlices {
  const organizations: Organization[] = [
    // -- Manufacturers --------------------------------------------------------
    {
      ...ctx.canonical(ORGS.acme),
      name: "Acme MicroMedia (Demo)",
      types: ["manufacturer", "brand_owner"],
      country: "DE",
      website: "https://acme-micromedia.example.com",
      identifiers: [{ scheme: "tax_code", value: "DE-DEMO-0001" }],
    },
    {
      ...ctx.canonical(ORGS.deltaBio),
      name: "Delta BioScience (Demo)",
      types: ["manufacturer", "brand_owner"],
      country: "US",
      website: "https://delta-bioscience.example.com",
      identifiers: [{ scheme: "tax_code", value: "US-DEMO-0002" }],
    },
    {
      ...ctx.canonical(ORGS.condor),
      name: "Condor LabWorks (Demo)",
      types: ["manufacturer", "brand_owner"],
      country: "FR",
      website: "https://condor-labworks.example.com",
      identifiers: [{ scheme: "tax_code", value: "FR-DEMO-0003" }],
    },
    // -- Distributors ---------------------------------------------------------
    {
      ...ctx.canonical(ORGS.mekong),
      name: "Mekong Lab Supply (Demo)",
      types: ["distributor", "importer"],
      country: "VN",
      website: "https://mekong-lab-supply.example.vn",
      identifiers: [{ scheme: "tax_code", value: "0312345678-DEMO" }],
    },
    {
      // Near-duplicate of ORGS.mekong created by a spreadsheet import: same
      // web domain, same Thu Duc address, no identifiers on file.
      ...ctx.canonical(ORGS.mekongDup),
      name: "MeKong Laboratory Supply Co. (Demo)",
      types: ["distributor"],
      country: "VN",
      website: "https://mekong-lab-supply.example.vn",
      identifiers: [],
    },
    {
      ...ctx.canonical(ORGS.saigon),
      name: "Saigon Scientific (Demo)",
      types: ["distributor"],
      country: "VN",
      website: "https://saigon-scientific.example.vn",
      identifiers: [{ scheme: "tax_code", value: "0309876543-DEMO" }],
    },
    // -- Customers --------------------------------------------------------------
    {
      ...ctx.canonical(ORGS.deltaPharma),
      name: "Delta Pharma Plant HCMC (Demo)",
      types: ["pharmaceutical_company"],
      country: "VN",
      website: "https://delta-pharma.example.vn",
      identifiers: [{ scheme: "gmp_certificate", value: "GMP-DEMO-VN-117" }],
    },
    {
      ...ctx.canonical(ORGS.anGiangFoods),
      name: "An Giang Foods (Demo)",
      types: ["food_manufacturer"],
      country: "VN",
      identifiers: [],
    },
    {
      ...ctx.canonical(ORGS.mekongContractLabs),
      name: "Mekong Contract Labs (Demo)",
      types: ["testing_laboratory"],
      country: "VN",
      identifiers: [],
    },
    // -- Tender buyer -----------------------------------------------------------
    {
      ...ctx.canonical(ORGS.redRiverHospital),
      name: "Red River Provincial Hospital (Demo)",
      types: ["hospital", "government_laboratory"],
      country: "VN",
      identifiers: [],
    },
  ];

  const organizationAliases: OrganizationAlias[] = [
    {
      ...ctx.canonical("alias-acme-micro-media"),
      organizationId: ORGS.acme,
      alias: "Acme Micro Media (Demo)",
      source: "user",
    },
    {
      // Import variant of the canonical distributor name — feeds both search
      // and the duplicate-pair score.
      ...ctx.canonical("alias-mekong-laboratory-supply"),
      organizationId: ORGS.mekong,
      alias: "MeKong Laboratory Supply Co. (Demo)",
      source: "import",
    },
  ];

  const organizationRelationships: OrganizationRelationship[] = [
    {
      ...ctx.canonical("rel-mekong-distributes-acme"),
      fromOrgId: ORGS.mekong,
      toOrgId: ORGS.acme,
      type: "distributes_for",
      evidence: edgeEvidence(SOURCES.acmeCatalogue, "analyst_reviewed", 0.9),
    },
    {
      ...ctx.canonical("rel-mekong-distributes-condor"),
      fromOrgId: ORGS.mekong,
      toOrgId: ORGS.condor,
      type: "distributes_for",
      evidence: edgeEvidence(SOURCES.condorCatalogue, "source_captured", 0.8),
    },
    {
      ...ctx.canonical("rel-saigon-distributes-delta"),
      fromOrgId: ORGS.saigon,
      toOrgId: ORGS.deltaBio,
      type: "distributes_for",
      evidence: edgeEvidence(SOURCES.deltaCatalogue, "source_captured", 0.8),
    },
  ];

  const addresses: Address[] = [
    {
      ...ctx.canonical(ADDRESSES.mekong),
      line1: "12 Demo Street, Ward 6",
      city: "Thu Duc",
      province: "Ho Chi Minh City",
      country: "VN",
    },
    {
      ...ctx.canonical(ADDRESSES.mekongDup),
      line1: "78 Demo Avenue, Ward 9",
      city: "Thu Duc",
      province: "Ho Chi Minh City",
      country: "VN",
    },
    {
      ...ctx.canonical(ADDRESSES.saigon),
      line1: "210 Demo Road, District 3",
      city: "Ho Chi Minh City",
      country: "VN",
    },
    {
      ...ctx.canonical(ADDRESSES.deltaPharma),
      line1: "Lot D-12, Demo Industrial Park",
      city: "Ho Chi Minh City",
      province: "Binh Chanh",
      country: "VN",
    },
    {
      ...ctx.canonical(ADDRESSES.anGiang),
      line1: "5 Demo Road",
      city: "Long Xuyen",
      province: "An Giang",
      country: "VN",
    },
    {
      ...ctx.canonical(ADDRESSES.contractLabs),
      line1: "88 Demo Street, Ninh Kieu",
      city: "Can Tho",
      country: "VN",
    },
    {
      ...ctx.canonical(ADDRESSES.redRiver),
      line1: "1 Demo Boulevard, Ba Dinh",
      city: "Ha Noi",
      country: "VN",
    },
  ];

  const geographies: Geography[] = [
    { ...ctx.canonical("geo-vn"), code: "VN", name: "Vietnam (Demo)", level: "country" },
    {
      ...ctx.canonical("geo-vn-sg"),
      code: "VN-SG",
      name: "Ho Chi Minh City (Demo)",
      level: "city",
      parentCode: "VN",
    },
    {
      ...ctx.canonical("geo-vn-hn"),
      code: "VN-HN",
      name: "Ha Noi (Demo)",
      level: "city",
      parentCode: "VN",
    },
  ];

  const sites: Site[] = [
    {
      ...ctx.canonical(SITES.deltaPharmaPlant),
      organizationId: ORGS.deltaPharma,
      name: "Binh Chanh Plant (Demo)",
      siteType: "factory",
      addressId: ADDRESSES.deltaPharma,
    },
    {
      ...ctx.canonical(SITES.mekongOffice),
      organizationId: ORGS.mekong,
      name: "Thu Duc Head Office (Demo)",
      siteType: "office",
      addressId: ADDRESSES.mekong,
    },
    {
      ...ctx.canonical(SITES.mekongDupWarehouse),
      organizationId: ORGS.mekongDup,
      name: "Thu Duc Warehouse (Demo)",
      siteType: "warehouse",
      addressId: ADDRESSES.mekongDup,
    },
    {
      ...ctx.canonical(SITES.saigonOffice),
      organizationId: ORGS.saigon,
      name: "District 3 Office (Demo)",
      siteType: "office",
      addressId: ADDRESSES.saigon,
    },
    {
      ...ctx.canonical(SITES.redRiverMain),
      organizationId: ORGS.redRiverHospital,
      name: "Main Campus (Demo)",
      siteType: "laboratory_site",
      addressId: ADDRESSES.redRiver,
    },
    {
      ...ctx.canonical(SITES.anGiangPlant),
      organizationId: ORGS.anGiangFoods,
      name: "Long Xuyen Plant (Demo)",
      siteType: "factory",
      addressId: ADDRESSES.anGiang,
    },
    {
      ...ctx.canonical(SITES.contractLabsSite),
      organizationId: ORGS.mekongContractLabs,
      name: "Can Tho Laboratory (Demo)",
      siteType: "laboratory_site",
      addressId: ADDRESSES.contractLabs,
    },
  ];

  const facilityUnits: FacilityUnit[] = [
    {
      ...ctx.canonical("funit-mekong-cold-room"),
      siteId: SITES.mekongOffice,
      name: "Cold Room 2-8 C (Demo)",
      description: "Shared cold storage for ready-prepared media (Demo).",
    },
  ];

  const laboratories: Laboratory[] = [
    {
      ...ctx.canonical(LABS.deltaPharmaMicro),
      siteId: SITES.deltaPharmaPlant,
      name: "QC Microbiology Laboratory (Demo)",
      labType: "microbiology",
    },
    {
      ...ctx.canonical(LABS.redRiverMicro),
      siteId: SITES.redRiverMain,
      name: "Hospital Microbiology Laboratory (Demo)",
      labType: "microbiology",
    },
  ];

  const productionLines: ProductionLine[] = [
    {
      ...ctx.canonical("line-delta-pharma-osd"),
      siteId: SITES.deltaPharmaPlant,
      name: "Oral Solids Line 2 (Demo)",
      productDescription: "Tablets and hard capsules (Demo).",
    },
  ];

  // -- People & account mapping (tenant-private overlay) -----------------------
  const people: Person[] = [
    {
      ...ctx.tenantPrivate(PEOPLE.nguyenVanAn, DEMO_TENANT_ID),
      fullName: "Nguyen Van An (Demo)",
      title: "QA Manager",
      email: "an.nguyen@delta-pharma.example.vn",
      notes: "Decision-maker for media substitutions (Demo).",
    },
    {
      ...ctx.tenantPrivate(PEOPLE.tranThiBinh, DEMO_TENANT_ID),
      fullName: "Tran Thi Binh (Demo)",
      title: "Procurement Lead",
      email: "binh.tran@delta-pharma.example.vn",
    },
    {
      // Belongs to tenant_other: must be invisible from the demo tenant.
      ...ctx.tenantPrivate(PEOPLE.phamThiLan, OTHER_TENANT_ID),
      fullName: "Pham Thi Lan (Demo)",
      title: "Lab Director",
    },
  ];

  const employmentRelationships: EmploymentRelationship[] = [
    {
      ...ctx.tenantPrivate("emp-an-delta-pharma", DEMO_TENANT_ID),
      personId: PEOPLE.nguyenVanAn,
      organizationId: ORGS.deltaPharma,
      role: "QA Manager",
      current: true,
      startedAt: ctx.daysAgo(1400),
    },
    {
      ...ctx.tenantPrivate("emp-binh-delta-pharma", DEMO_TENANT_ID),
      personId: PEOPLE.tranThiBinh,
      organizationId: ORGS.deltaPharma,
      role: "Procurement Lead",
      current: true,
      startedAt: ctx.daysAgo(900),
    },
  ];

  const organizationContacts: OrganizationContact[] = [
    {
      ...ctx.tenantPrivate("contact-an-delta-pharma", DEMO_TENANT_ID),
      personId: PEOPLE.nguyenVanAn,
      organizationId: ORGS.deltaPharma,
      siteId: SITES.deltaPharmaPlant,
      decisionRoles: ["qa_approver", "technical_evaluator"],
      isPrimary: true,
      notes: "Approves vendor list changes (Demo).",
    },
    {
      ...ctx.tenantPrivate("contact-binh-delta-pharma", DEMO_TENANT_ID),
      personId: PEOPLE.tranThiBinh,
      organizationId: ORGS.deltaPharma,
      siteId: SITES.deltaPharmaPlant,
      decisionRoles: ["procurement", "economic_buyer"],
      isPrimary: false,
    },
  ];

  return {
    organization: organizations,
    organization_alias: organizationAliases,
    organization_relationship: organizationRelationships,
    address: addresses,
    geography: geographies,
    site: sites,
    facility_unit: facilityUnits,
    laboratory: laboratories,
    production_line: productionLines,
    person: people,
    employment_relationship: employmentRelationships,
    organization_contact: organizationContacts,
  };
}
