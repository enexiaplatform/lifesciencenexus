-- 20260803000001_extend_product_categories.sql
-- Extends PRODUCT_CATEGORIES with the upstream → downstream → QC portfolio
-- verticals for Pharma API and Biopharma:
--   cell_culture_media          (upstream biopharma: basal media, feeds)
--   process_chemicals           (upstream/API: solvents, buffers, raw materials)
--   purification_chromatography (downstream: resins, membrane chromatography)
--   process_filtration          (downstream: sterilizing-grade filters, TFF)
--   endotoxin_testing           (QC: LAL / rFC assays)
-- Taxonomy-only change: refresh the two category CHECK constraints.
-- Idempotent: drop-if-exists + add.

alter table public.product_families
  drop constraint if exists product_families_category_check;
alter table public.product_families
  add constraint product_families_category_check check (category in (
    'dehydrated_culture_media', 'ready_prepared_media',
    'microbial_reference_materials', 'sterility_testing_consumables',
    'environmental_monitoring_consumables', 'biological_indicators',
    'air_samplers', 'particle_counters', 'sterility_testing_equipment',
    'microbiology_lab_accessories',
    'cell_culture_media', 'process_chemicals', 'purification_chromatography',
    'process_filtration', 'endotoxin_testing',
    'other'));

alter table public.products
  drop constraint if exists products_category_check;
alter table public.products
  add constraint products_category_check check (category in (
    'dehydrated_culture_media', 'ready_prepared_media',
    'microbial_reference_materials', 'sterility_testing_consumables',
    'environmental_monitoring_consumables', 'biological_indicators',
    'air_samplers', 'particle_counters', 'sterility_testing_equipment',
    'microbiology_lab_accessories',
    'cell_culture_media', 'process_chemicals', 'purification_chromatography',
    'process_filtration', 'endotoxin_testing',
    'other'));
