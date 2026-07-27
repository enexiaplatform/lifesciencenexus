import type {
  Application,
  Brand,
  IncubationCondition,
  Industry,
  Method,
  Organism,
  PackConfiguration,
  PreparationMethod,
  Product,
  ProductDocument,
  ProductEdge,
  ProductFamily,
  ProductFormat,
  SampleType,
  Sku,
  Standard,
  StandardVersion,
  TestType,
} from "@/lib/domain/types";

import { edgeEvidence, type SeedContext } from "./context";
import {
  APPLICATIONS,
  BRANDS,
  FAMILIES,
  FORMATS,
  INCUBATION,
  INDUSTRIES,
  METHODS,
  ORGANISMS,
  ORGS,
  PACKS,
  PREPARATION,
  PRODUCTS,
  SAMPLE_TYPES,
  SKUS,
  SOURCES,
  STANDARDS,
  STANDARD_VERSIONS,
  TEST_TYPES,
} from "./ids";
import type { DemoDatasetSlices } from "./types";

/**
 * Product graph fixtures: 3 manufacturers, 4 brands, 9 families across 7
 * categories, 12 products and 13 SKUs — including a discontinued SKU with a
 * successor and an import-created near-duplicate SKU — plus the scientific /
 * regulatory reference entities and the evidence-carrying product edges that
 * make "research a product" demonstrable.
 */
export function seedProducts(ctx: SeedContext): DemoDatasetSlices {
  const brands: Brand[] = [
    { ...ctx.canonical(BRANDS.acmeMedia), ownerOrganizationId: ORGS.acme, name: "Acme Media (Demo)" },
    { ...ctx.canonical(BRANDS.deltaBio), ownerOrganizationId: ORGS.deltaBio, name: "DeltaBio (Demo)" },
    { ...ctx.canonical(BRANDS.condorAir), ownerOrganizationId: ORGS.condor, name: "Condor Air (Demo)" },
    { ...ctx.canonical(BRANDS.condorSteri), ownerOrganizationId: ORGS.condor, name: "Condor Steri (Demo)" },
  ];

  const productFamilies: ProductFamily[] = [
    { ...ctx.canonical(FAMILIES.acmeDehydra), brandId: BRANDS.acmeMedia, name: "AcmeDehydra dehydrated media (Demo)", category: "dehydrated_culture_media" },
    { ...ctx.canonical(FAMILIES.acmePlates), brandId: BRANDS.acmeMedia, name: "AcmePlate ready media (Demo)", category: "ready_prepared_media" },
    { ...ctx.canonical(FAMILIES.deltaMedia), brandId: BRANDS.deltaBio, name: "DeltaBio dehydrated media (Demo)", category: "dehydrated_culture_media" },
    { ...ctx.canonical(FAMILIES.deltaPlates), brandId: BRANDS.deltaBio, name: "DeltaPlate ready media (Demo)", category: "ready_prepared_media" },
    { ...ctx.canonical(FAMILIES.deltaQc), brandId: BRANDS.deltaBio, name: "DeltaSeed QC organisms (Demo)", category: "microbial_reference_materials" },
    { ...ctx.canonical(FAMILIES.condorAir), brandId: BRANDS.condorAir, name: "Condor air sampling (Demo)", category: "air_samplers" },
    { ...ctx.canonical(FAMILIES.condorEm), brandId: BRANDS.condorAir, name: "Condor EM consumables (Demo)", category: "environmental_monitoring_consumables" },
    { ...ctx.canonical(FAMILIES.condorCount), brandId: BRANDS.condorAir, name: "Condor particle counting (Demo)", category: "particle_counters" },
    { ...ctx.canonical(FAMILIES.condorSteri), brandId: BRANDS.condorSteri, name: "CondorSter sterility consumables (Demo)", category: "sterility_testing_consumables" },
  ];

  const products: Product[] = [
    {
      ...ctx.canonical(PRODUCTS.tsaAcme),
      familyId: FAMILIES.acmeDehydra,
      manufacturerOrganizationId: ORGS.acme,
      name: "Tryptic Soy Agar (TSA) (Demo)",
      category: "dehydrated_culture_media",
      description: "General-purpose growth medium for aerobic microorganisms (Demo).",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.tsaPlatesAcme),
      familyId: FAMILIES.acmePlates,
      manufacturerOrganizationId: ORGS.acme,
      name: "TSA ready plates 90 mm (Demo)",
      category: "ready_prepared_media",
      description: "Ready-to-use 90 mm TSA plates for environmental monitoring (Demo).",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.nbAcme),
      familyId: FAMILIES.acmeDehydra,
      manufacturerOrganizationId: ORGS.acme,
      name: "Nutrient Broth (NB) (Demo)",
      category: "dehydrated_culture_media",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.tsaDelta),
      familyId: FAMILIES.deltaMedia,
      manufacturerOrganizationId: ORGS.deltaBio,
      name: "Tryptic Soy Agar dehydrated (Demo)",
      category: "dehydrated_culture_media",
      description: "DeltaBio equivalent of TSA dehydrated medium (Demo).",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.sdaPlatesDelta),
      familyId: FAMILIES.deltaPlates,
      manufacturerOrganizationId: ORGS.deltaBio,
      name: "Sabouraud Dextrose Agar ready plates (Demo)",
      category: "ready_prepared_media",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.qcDelta),
      familyId: FAMILIES.deltaQc,
      manufacturerOrganizationId: ORGS.deltaBio,
      name: "Bacillus subtilis ATCC 6633 QC pellets (Demo)",
      category: "microbial_reference_materials",
      status: "active",
    },
    {
      // Discontinued competitor product with a named successor.
      ...ctx.canonical(PRODUCTS.naDeltaOld),
      familyId: FAMILIES.deltaMedia,
      manufacturerOrganizationId: ORGS.deltaBio,
      name: "Nutrient Agar legacy formula (Demo)",
      category: "dehydrated_culture_media",
      status: "discontinued",
      successorProductId: PRODUCTS.naDelta,
    },
    {
      ...ctx.canonical(PRODUCTS.naDelta),
      familyId: FAMILIES.deltaMedia,
      manufacturerOrganizationId: ORGS.deltaBio,
      name: "Nutrient Agar NA-2 (Demo)",
      category: "dehydrated_culture_media",
      status: "active",
      predecessorProductId: PRODUCTS.naDeltaOld,
    },
    {
      ...ctx.canonical(PRODUCTS.airCondor),
      familyId: FAMILIES.condorAir,
      manufacturerOrganizationId: ORGS.condor,
      name: "Condor AirSampler AS-100 (Demo)",
      category: "air_samplers",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.emCondor),
      familyId: FAMILIES.condorEm,
      manufacturerOrganizationId: ORGS.condor,
      name: "AS-100 contact plates (Demo)",
      category: "environmental_monitoring_consumables",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.pcCondor),
      familyId: FAMILIES.condorCount,
      manufacturerOrganizationId: ORGS.condor,
      name: "CondorCount PC-50 particle counter (Demo)",
      category: "particle_counters",
      status: "active",
    },
    {
      ...ctx.canonical(PRODUCTS.steriCondor),
      familyId: FAMILIES.condorSteri,
      manufacturerOrganizationId: ORGS.condor,
      name: "SteriCan sterility test canisters (Demo)",
      category: "sterility_testing_consumables",
      status: "active",
    },
  ];

  const productFormats: ProductFormat[] = [
    { ...ctx.canonical(FORMATS.granulated), name: "Granulated dehydrated powder (Demo)", form: "granulated" },
    { ...ctx.canonical(FORMATS.readyPlate), name: "Ready-to-use 90 mm plate (Demo)", form: "ready_plate" },
    { ...ctx.canonical(FORMATS.pellet), name: "Lyophilized QC pellet (Demo)", form: "other" },
    { ...ctx.canonical(FORMATS.instrument), name: "Benchtop instrument (Demo)", form: "instrument" },
    { ...ctx.canonical(FORMATS.canister), name: "Sterility test canister (Demo)", form: "consumable" },
  ];

  const skus: Sku[] = [
    {
      ...ctx.canonical(SKUS.tsa500),
      productId: PRODUCTS.tsaAcme,
      catalogueNumber: "ACM-1058.0500",
      manufacturerCode: "1058",
      name: "TSA dehydrated medium 500 g (Demo)",
      alternateNames: ["TSA powder (Demo)", "Tryptic Soy Agar 500 g (Demo)"],
      formatId: FORMATS.granulated,
      shelfLifeMonths: 36,
      storageCondition: "ambient, dry",
      countryAvailability: ["VN", "SG", "KH"],
      status: "active",
    },
    {
      // Near-duplicate of SKUS.tsa500 created by a spreadsheet import: same
      // catalogue number, slightly different name, no commercial coverage.
      ...ctx.canonical(SKUS.tsa500Dup),
      productId: PRODUCTS.tsaAcme,
      catalogueNumber: "ACM-1058.0500",
      name: "TSA dehydrated medium 500 g bottle (Demo)",
      alternateNames: ["TSA 500g import (Demo)"],
      formatId: FORMATS.granulated,
      shelfLifeMonths: 36,
      storageCondition: "ambient, dry",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.tsaPlates20),
      productId: PRODUCTS.tsaPlatesAcme,
      catalogueNumber: "ACM-P2001",
      name: "TSA ready plates 90 mm 20/pack (Demo)",
      alternateNames: ["TSA ready-to-use plates (Demo)"],
      formatId: FORMATS.readyPlate,
      shelfLifeMonths: 6,
      storageCondition: "2-8 °C",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.nb500),
      productId: PRODUCTS.nbAcme,
      catalogueNumber: "ACM-1002.0500",
      name: "Nutrient Broth dehydrated medium 500 g (Demo)",
      alternateNames: [],
      formatId: FORMATS.granulated,
      shelfLifeMonths: 36,
      storageCondition: "ambient, dry",
      countryAvailability: ["VN", "SG"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.tsaDelta500),
      productId: PRODUCTS.tsaDelta,
      catalogueNumber: "DBS-5001.0500",
      name: "Tryptic Soy Agar dehydrated medium 500 g (Demo)",
      alternateNames: ["DeltaBio TSA 500 g (Demo)"],
      formatId: FORMATS.granulated,
      shelfLifeMonths: 36,
      storageCondition: "ambient, dry",
      countryAvailability: ["VN", "TH"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.sdaPlates20),
      productId: PRODUCTS.sdaPlatesDelta,
      catalogueNumber: "DBS-P3301",
      name: "SDA ready plates 90 mm 20/pack (Demo)",
      alternateNames: ["Sabouraud plates (Demo)"],
      formatId: FORMATS.readyPlate,
      shelfLifeMonths: 4,
      storageCondition: "2-8 °C",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.qcBsub10),
      productId: PRODUCTS.qcDelta,
      catalogueNumber: "DBS-Q6633",
      name: "B. subtilis ATCC 6633 QC pellets 10/pack (Demo)",
      alternateNames: ["DeltaSeed B. subtilis (Demo)"],
      formatId: FORMATS.pellet,
      shelfLifeMonths: 24,
      storageCondition: "-20 °C",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      // Discontinued competitor SKU with a successor.
      ...ctx.canonical(SKUS.naOld500),
      productId: PRODUCTS.naDeltaOld,
      catalogueNumber: "DBS-1007.0500",
      name: "Nutrient Agar legacy 500 g (Demo)",
      alternateNames: [],
      formatId: FORMATS.granulated,
      shelfLifeMonths: 36,
      storageCondition: "ambient, dry",
      countryAvailability: ["VN"],
      status: "discontinued",
      successorSkuId: SKUS.na2x500,
    },
    {
      ...ctx.canonical(SKUS.na2x500),
      productId: PRODUCTS.naDelta,
      catalogueNumber: "DBS-1107.0500",
      name: "Nutrient Agar NA-2 500 g (Demo)",
      alternateNames: [],
      formatId: FORMATS.granulated,
      shelfLifeMonths: 36,
      storageCondition: "ambient, dry",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.airAs100),
      productId: PRODUCTS.airCondor,
      catalogueNumber: "CLW-AS100",
      name: "AirSampler AS-100 100 L/min (Demo)",
      alternateNames: ["Condor air sampler (Demo)"],
      formatId: FORMATS.instrument,
      storageCondition: "ambient",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.emContact20),
      productId: PRODUCTS.emCondor,
      catalogueNumber: "CLW-EC20",
      name: "AS-100 contact plates ready 20/pack (Demo)",
      alternateNames: ["Condor contact plates (Demo)"],
      formatId: FORMATS.readyPlate,
      shelfLifeMonths: 6,
      storageCondition: "2-8 °C",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.pc50),
      productId: PRODUCTS.pcCondor,
      catalogueNumber: "CLW-PC50",
      name: "CondorCount PC-50 0.3 um particle counter (Demo)",
      alternateNames: [],
      formatId: FORMATS.instrument,
      storageCondition: "ambient",
      countryAvailability: ["VN"],
      status: "active",
    },
    {
      ...ctx.canonical(SKUS.steriCan10),
      productId: PRODUCTS.steriCondor,
      catalogueNumber: "CLW-ST110",
      name: "SteriCan canisters 10/box (Demo)",
      alternateNames: [],
      formatId: FORMATS.canister,
      shelfLifeMonths: 24,
      storageCondition: "ambient, dry",
      countryAvailability: ["VN"],
      status: "active",
    },
  ];

  const packConfigurations: PackConfiguration[] = [
    { ...ctx.canonical(PACKS.tsa500), skuId: SKUS.tsa500, quantity: 500, unit: "g", description: "500 g bottle" },
    { ...ctx.canonical(PACKS.tsaPlates20), skuId: SKUS.tsaPlates20, quantity: 20, unit: "plate", unitsPerPack: 20, description: "90 mm plates, 20 per pack" },
    { ...ctx.canonical(PACKS.nb500), skuId: SKUS.nb500, quantity: 500, unit: "g", description: "500 g bottle" },
    { ...ctx.canonical(PACKS.tsaDelta500), skuId: SKUS.tsaDelta500, quantity: 500, unit: "g", description: "500 g bottle" },
    { ...ctx.canonical(PACKS.sda20), skuId: SKUS.sdaPlates20, quantity: 20, unit: "plate", unitsPerPack: 20, description: "90 mm plates, 20 per pack" },
    { ...ctx.canonical(PACKS.qcBsub10), skuId: SKUS.qcBsub10, quantity: 1, unit: "pack", unitsPerPack: 10, description: "10 pellets per pack" },
    { ...ctx.canonical(PACKS.na2x500), skuId: SKUS.na2x500, quantity: 500, unit: "g", description: "500 g bottle" },
    { ...ctx.canonical(PACKS.emContact20), skuId: SKUS.emContact20, quantity: 20, unit: "plate", unitsPerPack: 20, description: "Contact plates, 20 per pack" },
    { ...ctx.canonical(PACKS.steri10), skuId: SKUS.steriCan10, quantity: 1, unit: "box", unitsPerPack: 10, description: "10 canisters per box" },
    { ...ctx.canonical(PACKS.airAs100), skuId: SKUS.airAs100, quantity: 1, unit: "unit", description: "One instrument" },
    { ...ctx.canonical(PACKS.pc50), skuId: SKUS.pc50, quantity: 1, unit: "unit", description: "One instrument" },
  ];

  const productDocuments: ProductDocument[] = [
    {
      ...ctx.canonical("pdoc-tsa-tds"),
      skuId: SKUS.tsa500,
      docType: "tds",
      title: "TSA Technical Data Sheet (Demo)",
      sourceId: SOURCES.acmeCatalogue,
    },
    {
      ...ctx.canonical("pdoc-tsa-coa"),
      skuId: SKUS.tsa500,
      docType: "coa",
      title: "TSA Certificate of Analysis template (Demo)",
      sourceId: SOURCES.acmeCatalogue,
    },
    {
      ...ctx.canonical("pdoc-tp-ifu"),
      skuId: SKUS.tsaPlates20,
      docType: "instruction",
      title: "TSA ready plates instructions for use (Demo)",
      sourceId: SOURCES.acmeWebsite,
    },
    {
      ...ctx.canonical("pdoc-as100-manual"),
      productId: PRODUCTS.airCondor,
      docType: "instruction",
      title: "AirSampler AS-100 user manual (Demo)",
      sourceId: SOURCES.condorCatalogue,
    },
  ];

  // -- Scientific / regulatory reference entities ------------------------------
  // Generic reference names are real public-fact-like terms; the records
  // themselves are still synthetic (isDemo: true).
  const applications: Application[] = [
    { ...ctx.canonical(APPLICATIONS.sterilityTesting), name: "Sterility testing", industryCodes: ["pharma"] },
    { ...ctx.canonical(APPLICATIONS.microbialLimits), name: "Microbial limits testing", industryCodes: ["pharma", "food_beverage"] },
    { ...ctx.canonical(APPLICATIONS.envMonitoring), name: "Environmental monitoring", industryCodes: ["pharma"] },
    { ...ctx.canonical(APPLICATIONS.growthPromotion), name: "Growth promotion testing", industryCodes: ["pharma", "food_beverage"] },
    { ...ctx.canonical(APPLICATIONS.mediaFill), name: "Media fill trials", industryCodes: ["pharma"] },
  ];

  const methods: Method[] = [
    {
      ...ctx.canonical(METHODS.membraneFiltration),
      name: "Membrane filtration",
      description: "Filtration-based sterility and bioburden method (Demo).",
      standardIds: [STANDARDS.usp71],
    },
    {
      ...ctx.canonical(METHODS.plateCount),
      name: "Plate count method",
      description: "Pour-plate / spread-plate enumeration (Demo).",
      standardIds: [STANDARDS.iso11133],
    },
  ];

  const standards: Standard[] = [
    {
      ...ctx.canonical(STANDARDS.iso11133),
      body: "ISO",
      code: "11133",
      title: "Microbiology of the food chain — Preparation, production, storage and performance testing of culture media",
    },
    {
      ...ctx.canonical(STANDARDS.iso17025),
      body: "ISO",
      code: "17025",
      title: "General requirements for the competence of testing and calibration laboratories",
    },
    {
      ...ctx.canonical(STANDARDS.usp61),
      body: "USP",
      code: "61",
      title: "Microbiological Examination of Nonsterile Products: Microbial Enumeration Tests",
    },
    {
      ...ctx.canonical(STANDARDS.usp71),
      body: "USP",
      code: "71",
      title: "Sterility Tests",
    },
    {
      // Fictional TCVN code — clearly a demo standard.
      ...ctx.canonical(STANDARDS.tcvnDemo),
      body: "TCVN",
      code: "9999",
      title: "Culture media for industrial microbiology — Demo specification",
    },
  ];

  const standardVersions: StandardVersion[] = [
    { ...ctx.canonical(STANDARD_VERSIONS.iso11133v2014), standardId: STANDARDS.iso11133, version: "2014", year: 2014, status: "current" },
    { ...ctx.canonical(STANDARD_VERSIONS.iso17025v2017), standardId: STANDARDS.iso17025, version: "2017", year: 2017, status: "current" },
    { ...ctx.canonical(STANDARD_VERSIONS.usp61v2024), standardId: STANDARDS.usp61, version: "2024", year: 2024, status: "current" },
    { ...ctx.canonical(STANDARD_VERSIONS.usp71v2024), standardId: STANDARDS.usp71, version: "2024", year: 2024, status: "current" },
    { ...ctx.canonical(STANDARD_VERSIONS.tcvnV2025), standardId: STANDARDS.tcvnDemo, version: "2025", year: 2025, status: "current" },
  ];

  const organisms: Organism[] = [
    { ...ctx.canonical(ORGANISMS.bsub), genus: "Bacillus", species: "subtilis", strainCode: "ATCC 6633", gramReaction: "positive" },
    { ...ctx.canonical(ORGANISMS.ecoli), genus: "Escherichia", species: "coli", strainCode: "ATCC 8739", gramReaction: "negative" },
    { ...ctx.canonical(ORGANISMS.saur), genus: "Staphylococcus", species: "aureus", strainCode: "ATCC 6538", gramReaction: "positive" },
    { ...ctx.canonical(ORGANISMS.paer), genus: "Pseudomonas", species: "aeruginosa", strainCode: "ATCC 9027", gramReaction: "negative" },
    { ...ctx.canonical(ORGANISMS.calb), genus: "Candida", species: "albicans", strainCode: "ATCC 10231", gramReaction: "variable" },
  ];

  const sampleTypes: SampleType[] = [
    { ...ctx.canonical(SAMPLE_TYPES.water), name: "Purified water" },
    { ...ctx.canonical(SAMPLE_TYPES.air), name: "Air (ambient / compressed)" },
    { ...ctx.canonical(SAMPLE_TYPES.surface), name: "Surface swab" },
    { ...ctx.canonical(SAMPLE_TYPES.rawMaterial), name: "Raw material" },
  ];

  const industries: Industry[] = [
    { ...ctx.canonical(INDUSTRIES.pharma), code: "pharma", name: "Pharmaceuticals" },
    { ...ctx.canonical(INDUSTRIES.food), code: "food_beverage", name: "Food & beverage" },
  ];

  const testTypes: TestType[] = [
    { ...ctx.canonical(TEST_TYPES.bioburden), name: "Bioburden" },
    { ...ctx.canonical(TEST_TYPES.sterilityTest), name: "Sterility test" },
  ];

  const incubationConditions: IncubationCondition[] = [
    {
      ...ctx.canonical(INCUBATION.aerobic3035),
      temperatureCelsius: 32.5,
      durationHours: 72,
      atmosphere: "aerobic",
      description: "30-35 °C, 3 days, aerobic (Demo)",
    },
  ];

  const preparationMethods: PreparationMethod[] = [
    {
      ...ctx.canonical(PREPARATION.autoclave),
      name: "Autoclave 121 °C 15 min (Demo)",
      description: "Standard moist-heat sterilization of dehydrated media (Demo).",
    },
  ];

  // -- Evidence-carrying product edges ------------------------------------------
  const e = edgeEvidence;
  const productEdges: ProductEdge[] = [
    // TSA dehydrated (Acme) — the richest node in the graph.
    { ...ctx.canonical("edge-tsa-app-limits"), productId: PRODUCTS.tsaAcme, targetType: "application", targetId: APPLICATIONS.microbialLimits, role: "intended_use", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.9) },
    { ...ctx.canonical("edge-tsa-app-em"), productId: PRODUCTS.tsaAcme, targetType: "application", targetId: APPLICATIONS.envMonitoring, role: "intended_use", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.9) },
    { ...ctx.canonical("edge-tsa-app-gpt"), productId: PRODUCTS.tsaAcme, targetType: "application", targetId: APPLICATIONS.growthPromotion, role: "intended_use", evidence: e(SOURCES.acmeCatalogue, "analyst_reviewed", 0.9) },
    { ...ctx.canonical("edge-tsa-std-11133"), productId: PRODUCTS.tsaAcme, targetType: "standard", targetId: STANDARDS.iso11133, role: "conforms_to", evidence: e(SOURCES.iso11133, "source_captured", 0.95) },
    { ...ctx.canonical("edge-tsa-std-usp61"), productId: PRODUCTS.tsaAcme, targetType: "standard", targetId: STANDARDS.usp61, role: "conforms_to", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.85) },
    { ...ctx.canonical("edge-tsa-std-tcvn"), productId: PRODUCTS.tsaAcme, targetType: "standard", targetId: STANDARDS.tcvnDemo, role: "conforms_to", evidence: e(SOURCES.internalNote, "unverified", 0.4) },
    { ...ctx.canonical("edge-tsa-orgm-ecoli"), productId: PRODUCTS.tsaAcme, targetType: "organism", targetId: ORGANISMS.ecoli, role: "growth_promotion", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.9) },
    { ...ctx.canonical("edge-tsa-orgm-saur"), productId: PRODUCTS.tsaAcme, targetType: "organism", targetId: ORGANISMS.saur, role: "growth_promotion", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.9) },
    { ...ctx.canonical("edge-tsa-orgm-bsub"), productId: PRODUCTS.tsaAcme, targetType: "organism", targetId: ORGANISMS.bsub, role: "growth_promotion", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.9) },
    { ...ctx.canonical("edge-tsa-orgm-paer"), productId: PRODUCTS.tsaAcme, targetType: "organism", targetId: ORGANISMS.paer, role: "growth_promotion", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.9) },
    { ...ctx.canonical("edge-tsa-smp-water"), productId: PRODUCTS.tsaAcme, targetType: "sample_type", targetId: SAMPLE_TYPES.water, role: "sample_type", evidence: e(SOURCES.internalNote, "unverified", 0.4) },
    { ...ctx.canonical("edge-tsa-ind-pharma"), productId: PRODUCTS.tsaAcme, targetType: "industry", targetId: INDUSTRIES.pharma, role: "target_industry", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.85) },
    { ...ctx.canonical("edge-tsa-ind-food"), productId: PRODUCTS.tsaAcme, targetType: "industry", targetId: INDUSTRIES.food, role: "target_industry", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.85) },
    { ...ctx.canonical("edge-tsa-prep"), productId: PRODUCTS.tsaAcme, targetType: "preparation_method", targetId: PREPARATION.autoclave, role: "preparation", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.9) },
    // TSA ready plates (Acme)
    { ...ctx.canonical("edge-tp-app-em"), productId: PRODUCTS.tsaPlatesAcme, targetType: "application", targetId: APPLICATIONS.envMonitoring, role: "intended_use", evidence: e(SOURCES.acmeWebsite, "source_captured", 0.85) },
    { ...ctx.canonical("edge-tp-std-11133"), productId: PRODUCTS.tsaPlatesAcme, targetType: "standard", targetId: STANDARDS.iso11133, role: "conforms_to", evidence: e(SOURCES.iso11133, "source_captured", 0.9) },
    { ...ctx.canonical("edge-tp-ind-pharma"), productId: PRODUCTS.tsaPlatesAcme, targetType: "industry", targetId: INDUSTRIES.pharma, role: "target_industry", evidence: e(SOURCES.acmeWebsite, "source_captured", 0.8) },
    { ...ctx.canonical("edge-tp-inc"), productId: PRODUCTS.tsaPlatesAcme, targetType: "incubation_condition", targetId: INCUBATION.aerobic3035, role: "incubation", evidence: e(SOURCES.acmeWebsite, "source_captured", 0.8) },
    // TSA dehydrated (DeltaBio) — thinner evidence on purpose.
    { ...ctx.canonical("edge-td-app-limits"), productId: PRODUCTS.tsaDelta, targetType: "application", targetId: APPLICATIONS.microbialLimits, role: "intended_use", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.8) },
    { ...ctx.canonical("edge-td-std-11133"), productId: PRODUCTS.tsaDelta, targetType: "standard", targetId: STANDARDS.iso11133, role: "conforms_to", evidence: e(SOURCES.deltaCatalogue, "unverified", 0.5) },
    { ...ctx.canonical("edge-td-ind-pharma"), productId: PRODUCTS.tsaDelta, targetType: "industry", targetId: INDUSTRIES.pharma, role: "target_industry", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.8) },
    // SDA ready plates (DeltaBio)
    { ...ctx.canonical("edge-sda-app-em"), productId: PRODUCTS.sdaPlatesDelta, targetType: "application", targetId: APPLICATIONS.envMonitoring, role: "intended_use", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.8) },
    { ...ctx.canonical("edge-sda-orgm-calb"), productId: PRODUCTS.sdaPlatesDelta, targetType: "organism", targetId: ORGANISMS.calb, role: "growth_promotion", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.85) },
    { ...ctx.canonical("edge-sda-std-11133"), productId: PRODUCTS.sdaPlatesDelta, targetType: "standard", targetId: STANDARDS.iso11133, role: "conforms_to", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.8) },
    // QC pellets (DeltaBio)
    { ...ctx.canonical("edge-qc-orgm-bsub"), productId: PRODUCTS.qcDelta, targetType: "organism", targetId: ORGANISMS.bsub, role: "qc_test_strain", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.95) },
    { ...ctx.canonical("edge-qc-app-gpt"), productId: PRODUCTS.qcDelta, targetType: "application", targetId: APPLICATIONS.growthPromotion, role: "intended_use", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.9) },
    { ...ctx.canonical("edge-qc-std-17025"), productId: PRODUCTS.qcDelta, targetType: "standard", targetId: STANDARDS.iso17025, role: "supports", evidence: e(SOURCES.deltaCatalogue, "source_captured", 0.7) },
    // EM consumables (Condor)
    { ...ctx.canonical("edge-em-app-em"), productId: PRODUCTS.emCondor, targetType: "application", targetId: APPLICATIONS.envMonitoring, role: "intended_use", evidence: e(SOURCES.condorCatalogue, "source_captured", 0.85) },
    { ...ctx.canonical("edge-em-tt-bioburden"), productId: PRODUCTS.emCondor, targetType: "test_type", targetId: TEST_TYPES.bioburden, role: "test_type", evidence: e(SOURCES.condorCatalogue, "source_captured", 0.8) },
    { ...ctx.canonical("edge-em-smp-air"), productId: PRODUCTS.emCondor, targetType: "sample_type", targetId: SAMPLE_TYPES.air, role: "sample_type", evidence: e(SOURCES.condorCatalogue, "source_captured", 0.8) },
    { ...ctx.canonical("edge-em-smp-surface"), productId: PRODUCTS.emCondor, targetType: "sample_type", targetId: SAMPLE_TYPES.surface, role: "sample_type", evidence: e(SOURCES.condorCatalogue, "source_captured", 0.8) },
    // Sterility canisters (Condor)
    { ...ctx.canonical("edge-st-app-sterility"), productId: PRODUCTS.steriCondor, targetType: "application", targetId: APPLICATIONS.sterilityTesting, role: "intended_use", evidence: e(SOURCES.condorCatalogue, "source_captured", 0.85) },
    { ...ctx.canonical("edge-st-std-usp71"), productId: PRODUCTS.steriCondor, targetType: "standard", targetId: STANDARDS.usp71, role: "conforms_to", evidence: e(SOURCES.condorCatalogue, "source_captured", 0.85) },
    { ...ctx.canonical("edge-st-mth-membrane"), productId: PRODUCTS.steriCondor, targetType: "method", targetId: METHODS.membraneFiltration, role: "method", evidence: e(SOURCES.condorCatalogue, "source_captured", 0.85) },
    // Nutrient Broth (Acme) — food industry angle.
    { ...ctx.canonical("edge-nb-app-limits"), productId: PRODUCTS.nbAcme, targetType: "application", targetId: APPLICATIONS.microbialLimits, role: "intended_use", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.8) },
    { ...ctx.canonical("edge-nb-ind-food"), productId: PRODUCTS.nbAcme, targetType: "industry", targetId: INDUSTRIES.food, role: "target_industry", evidence: e(SOURCES.acmeCatalogue, "source_captured", 0.8) },
  ];

  return {
    brand: brands,
    product_family: productFamilies,
    product: products,
    product_format: productFormats,
    sku: skus,
    pack_configuration: packConfigurations,
    product_document: productDocuments,
    application: applications,
    method: methods,
    standard: standards,
    standard_version: standardVersions,
    organism: organisms,
    sample_type: sampleTypes,
    industry: industries,
    test_type: testTypes,
    incubation_condition: incubationConditions,
    preparation_method: preparationMethods,
    product_edge: productEdges,
  };
}
