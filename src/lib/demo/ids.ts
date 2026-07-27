/**
 * Stable, human-readable ids for every seeded demo record. Centralized so the
 * modular seed files can cross-link records without import cycles.
 *
 * Ids are slug-like (`org-acme-micromedia`) on purpose: demo data should be
 * easy to recognize in the UI, in tests and in signal explanations.
 */

export const DEMO_TENANT_ID = "tenant_demo";
export const OTHER_TENANT_ID = "tenant_other";

export const USERS = {
  demoOwner: "user_demo_owner",
  demoAnalyst: "user_demo_analyst",
  demoViewer: "user_demo_viewer",
  otherOwner: "user_other_owner",
} as const;

export const ORGS = {
  acme: "org-acme-micromedia",
  deltaBio: "org-delta-bioscience",
  condor: "org-condor-labworks",
  mekong: "org-mekong-lab-supply",
  mekongDup: "org-mekong-laboratory-supply",
  saigon: "org-saigon-scientific",
  deltaPharma: "org-delta-pharma-hcmc",
  anGiangFoods: "org-an-giang-foods",
  mekongContractLabs: "org-mekong-contract-labs",
  redRiverHospital: "org-red-river-hospital",
} as const;

export const ADDRESSES = {
  mekong: "addr-mekong-thu-duc",
  mekongDup: "addr-mekong-dup-thu-duc",
  saigon: "addr-saigon-hcmc",
  deltaPharma: "addr-delta-pharma-binh-chanh",
  anGiang: "addr-an-giang-long-xuyen",
  contractLabs: "addr-mekong-contract-labs-can-tho",
  redRiver: "addr-red-river-ha-noi",
} as const;

export const SITES = {
  deltaPharmaPlant: "site-delta-pharma-plant",
  mekongOffice: "site-mekong-office",
  mekongDupWarehouse: "site-mekong-dup-warehouse",
  saigonOffice: "site-saigon-office",
  redRiverMain: "site-red-river-main",
  anGiangPlant: "site-an-giang-plant",
  contractLabsSite: "site-mekong-contract-labs-site",
} as const;

export const LABS = {
  deltaPharmaMicro: "lab-delta-pharma-micro",
  redRiverMicro: "lab-red-river-micro",
} as const;

export const PEOPLE = {
  nguyenVanAn: "person-nguyen-van-an",
  tranThiBinh: "person-tran-thi-binh",
  /** Deliberate tenant_other record for isolation tests. */
  phamThiLan: "person-pham-thi-lan",
} as const;

export const BRANDS = {
  acmeMedia: "brand-acme-media",
  deltaBio: "brand-deltabio",
  condorAir: "brand-condor-air",
  condorSteri: "brand-condor-steri",
} as const;

export const FAMILIES = {
  acmeDehydra: "fam-acme-dehydra",
  acmePlates: "fam-acme-plates",
  deltaMedia: "fam-delta-media",
  deltaPlates: "fam-delta-plates",
  deltaQc: "fam-delta-qc",
  condorAir: "fam-condor-air",
  condorEm: "fam-condor-em",
  condorCount: "fam-condor-count",
  condorSteri: "fam-condor-steri",
} as const;

export const PRODUCTS = {
  tsaAcme: "prod-tsa-acme",
  tsaPlatesAcme: "prod-tsa-plates-acme",
  nbAcme: "prod-nb-acme",
  tsaDelta: "prod-tsa-delta",
  sdaPlatesDelta: "prod-sda-plates-delta",
  qcDelta: "prod-qc-delta",
  naDeltaOld: "prod-na-delta-old",
  naDelta: "prod-na-delta",
  airCondor: "prod-air-condor",
  emCondor: "prod-em-condor",
  pcCondor: "prod-pc-condor",
  steriCondor: "prod-steri-condor",
} as const;

export const SKUS = {
  tsa500: "sku-tsa-500",
  /** Import-created near-duplicate of tsa500 (same catalogue number). */
  tsa500Dup: "sku-tsa-500-dup",
  tsaPlates20: "sku-tsa-plates-20",
  nb500: "sku-nb-500",
  tsaDelta500: "sku-tsa-delta-500",
  sdaPlates20: "sku-sda-plates-20",
  qcBsub10: "sku-qc-bsub-10",
  naOld500: "sku-na-old-500",
  na2x500: "sku-na2-500",
  airAs100: "sku-air-as100",
  emContact20: "sku-em-contact-20",
  pc50: "sku-pc50",
  steriCan10: "sku-steri-can-10",
} as const;

export const PACKS = {
  tsa500: "pack-tsa-500",
  tsaPlates20: "pack-tsa-plates-20",
  nb500: "pack-nb-500",
  tsaDelta500: "pack-tsa-delta-500",
  sda20: "pack-sda-20",
  qcBsub10: "pack-qc-bsub-10",
  na2x500: "pack-na2-500",
  emContact20: "pack-em-contact-20",
  steri10: "pack-steri-10",
  airAs100: "pack-air-as100",
  pc50: "pack-pc50",
} as const;

export const FORMATS = {
  granulated: "fmt-granulated",
  readyPlate: "fmt-ready-plate",
  pellet: "fmt-pellet",
  instrument: "fmt-instrument",
  canister: "fmt-canister",
} as const;

export const APPLICATIONS = {
  sterilityTesting: "app-sterility-testing",
  microbialLimits: "app-microbial-limits",
  envMonitoring: "app-environmental-monitoring",
  growthPromotion: "app-growth-promotion",
  mediaFill: "app-media-fill",
} as const;

export const METHODS = {
  membraneFiltration: "mth-membrane-filtration",
  plateCount: "mth-plate-count",
} as const;

export const STANDARDS = {
  iso11133: "std-iso-11133",
  iso17025: "std-iso-17025",
  usp61: "std-usp-61",
  usp71: "std-usp-71",
  tcvnDemo: "std-tcvn-9999",
} as const;

export const STANDARD_VERSIONS = {
  iso11133v2014: "stdv-iso-11133-2014",
  iso17025v2017: "stdv-iso-17025-2017",
  usp61v2024: "stdv-usp-61-2024",
  usp71v2024: "stdv-usp-71-2024",
  tcvnV2025: "stdv-tcvn-9999-2025",
} as const;

export const ORGANISMS = {
  bsub: "orgm-bacillus-subtilis-atcc-6633",
  ecoli: "orgm-escherichia-coli-atcc-8739",
  saur: "orgm-staphylococcus-aureus-atcc-6538",
  paer: "orgm-pseudomonas-aeruginosa-atcc-9027",
  calb: "orgm-candida-albicans-atcc-10231",
} as const;

export const SAMPLE_TYPES = {
  water: "smp-purified-water",
  air: "smp-air",
  surface: "smp-surface-swab",
  rawMaterial: "smp-raw-material",
} as const;

export const INDUSTRIES = {
  pharma: "ind-pharma",
  food: "ind-food-beverage",
} as const;

export const TEST_TYPES = {
  bioburden: "tt-bioburden",
  sterilityTest: "tt-sterility-test",
} as const;

export const INCUBATION = { aerobic3035: "inc-aerobic-30-35-3d" } as const;
export const PREPARATION = { autoclave: "prep-autoclave-121-15" } as const;

export const SOURCES = {
  acmeCatalogue: "src-acme-catalogue",
  acmeWebsite: "src-acme-website",
  deltaCatalogue: "src-delta-catalogue",
  condorCatalogue: "src-condor-catalogue",
  mekongQuote: "src-mekong-quote",
  mekongQuoteOld: "src-mekong-quote-old",
  saigonQuote: "src-saigon-quote",
  internalNote: "src-internal-note",
  tenderDoc: "src-tender-doc",
  iso11133: "src-iso-11133",
  fieldObservation: "src-field-observation",
  importRecord: "src-import-record",
} as const;

export const SOURCE_DOCUMENTS = {
  tenderPdf: "sdoc-tender-pdf",
  mekongQuotePdf: "sdoc-mekong-quote-pdf",
} as const;

export const CLAIMS = {
  tsaDistributed: "claim-tsa-distributed",
  tpDistributed: "claim-tp-distributed",
  tdDistributed: "claim-td-distributed",
  qcDistributed: "claim-qc-distributed",
  tsaConforms: "claim-tsa-conforms",
  tsaGptEcoli: "claim-tsa-gpt-ecoli",
  tpShelfLife: "claim-tp-shelf-life",
  tsaPrice: "claim-tsa-price",
  tdPrice: "claim-td-price",
  equivFormula: "claim-equiv-formula",
  naDiscontinued: "claim-na-discontinued",
  mekongAuthorized: "claim-mekong-authorized",
  dpUsesTsa: "claim-dp-uses-tsa",
  dpUsesPlates: "claim-dp-uses-plates",
  emLeadTime: "claim-em-lead-time",
  sdaPrice: "claim-sda-price",
  as100Warranty: "claim-as100-warranty",
  tenderIncumbent: "claim-tender-incumbent",
} as const;

export const EVIDENCE_REVIEWS = {
  conformsCaptured: "rev-tsa-conforms-captured",
  conformsAnalyst: "rev-tsa-conforms-analyst",
  mekongAnalyst: "rev-mekong-analyst",
} as const;

export const DQ_ISSUES = {
  duplicatePair: "dq-duplicate-mekong",
  stalePrice: "dq-stale-price-sda",
  missingWebsite: "dq-missing-website-an-giang",
  missingGtin: "dq-missing-gtin-pc50",
} as const;

export const SUPPLIER_PROFILES = {
  mekong: "supp-mekong",
  mekongDup: "supp-mekong-dup",
  saigon: "supp-saigon",
} as const;

export const AGREEMENTS = {
  acmeMekong: "dagr-acme-mekong",
  deltaSaigon: "dagr-delta-saigon",
} as const;

export const LISTINGS = {
  mekongTsa: "listing-mekong-tsa",
  mekongTp: "listing-mekong-tp",
  mekongNb: "listing-mekong-nb",
  mekongAir: "listing-mekong-air",
  mekongEm: "listing-mekong-em",
  mekongPc: "listing-mekong-pc",
  saigonTd: "listing-saigon-td",
  saigonSda: "listing-saigon-sda",
  saigonQc: "listing-saigon-qc",
  saigonNa2: "listing-saigon-na2",
  saigonSteri: "listing-saigon-steri",
} as const;

export const AVAILABILITY = {
  tsaInStock: "avail-tsa-in-stock",
  tpLimited: "avail-tp-limited",
  tpOutOfStock: "avail-tp-out-of-stock",
  sdaOutOfStock: "avail-sda-out-of-stock",
  airInStock: "avail-air-in-stock",
  emInStock: "avail-em-in-stock",
  pcInStock: "avail-pc-in-stock",
  na2InStock: "avail-na2-in-stock",
} as const;

export const PRICES = {
  tsaOld: "price-tsa-old",
  tsaNew: "price-tsa-new",
  tp: "price-tp",
  nb: "price-nb",
  tdNew: "price-td-new",
  tdOld: "price-td-old",
  sdaStale: "price-sda-stale",
  qc: "price-qc",
  em: "price-em",
} as const;

export const PRICE_COMPONENTS = {
  qcFreight: "pcomp-qc-freight",
  sdaDuty: "pcomp-sda-duty",
} as const;

export const COMMERCIAL_TERMS = { mekong: "cterms-mekong" } as const;

export const TENDER = {
  tender: "tender-rrh-2025-014",
  lotMedia: "lot-rrh-media",
  lotQc: "lot-rrh-qc",
  itemTsa: "item-rrh-tsa",
  itemTsaPlates: "item-rrh-tsa-plates",
  itemQc: "item-rrh-qc",
  bidMekong: "bid-rrh-mekong",
  bidSaigon: "bid-rrh-saigon",
  awardMedia: "award-rrh-media",
  evPublished: "tev-rrh-published",
  evClarification: "tev-rrh-clarification",
  evClosed: "tev-rrh-closed",
  evAwarded: "tev-rrh-awarded",
} as const;

export const ASSET_MODELS = {
  as100: "model-airsampler-as100",
  pc50: "model-condorcount-pc50",
} as const;

export const ASSETS = {
  as100: "asset-as100-delta-pharma",
  pc50: "asset-pc50-delta-pharma",
} as const;

export const ASSET_EVENTS = {
  as100Installed: "ale-as100-installed",
  pc50Installed: "ale-pc50-installed",
  as100Calibration: "maint-as100-calibration",
  as100Pq: "qual-as100-pq",
} as const;

export const COMPATIBILITIES = {
  as100Em: "compat-as100-em",
  as100Tp: "compat-as100-tp",
} as const;

export const CONSUMPTION = { as100Em: "cons-as100-em" } as const;
export const REPLACEMENT_ASSUMPTIONS = { airSampler: "rass-air-sampler" } as const;

export const VENDOR_APPROVALS = {
  mekongExpired: "vappr-mekong-expired",
  saigonApproved: "vappr-saigon-approved",
} as const;

export const VALIDATIONS = {
  tdInProgress: "pval-td-in-progress",
  tsaPassed: "pval-tsa-passed",
} as const;

export const TRIALS = {
  tdSample: "trial-td-sample",
  tdStarted: "trial-td-started",
} as const;

export const RESEARCH = {
  project: "rp-ready-media-vn",
  notePlates: "rnote-plates-shift",
  noteTender: "rnote-tender-bundle",
  findingFact: "rfind-fact",
  findingInterpretation: "rfind-interpretation",
  findingAssumption: "rfind-assumption",
  findingUnknown: "rfind-unknown",
  findingRecommendation: "rfind-recommendation",
  linkProduct: "rpe-product",
  linkSku: "rpe-sku",
  linkOrg: "rpe-org",
  linkTender: "rpe-tender",
  savedView: "view-ready-media-skus",
  exportPdf: "export-ready-media-pdf",
  /** Deliberate tenant_other record for isolation tests. */
  otherProject: "rp-other-tenant-watch",
} as const;

export const COST_SCENARIOS = {
  tsaDehydrated: "cpt-tsa-dehydrated",
  tsaPlates: "cpt-tsa-plates",
} as const;

export const EQUIVALENCES = {
  tsaDeltaVsAcme: "equiv-tsa-delta-vs-acme",
  sdaVsTsaPlates: "equiv-sda-vs-tsa-plates",
} as const;

export const MEMBERSHIPS = {
  demoOwner: "mem-demo-owner",
  demoAnalyst: "mem-demo-analyst",
  demoViewer: "mem-demo-viewer",
  otherOwner: "mem-other-owner",
} as const;

export const PROFILES = {
  demoOwner: "profile-demo-owner",
  demoAnalyst: "profile-demo-analyst",
  demoViewer: "profile-demo-viewer",
  otherOwner: "profile-other-owner",
} as const;
