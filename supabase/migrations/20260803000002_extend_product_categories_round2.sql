-- 20260803000002_extend_product_categories_round2.sql
-- Second taxonomy wave: analytical QC / R&D coverage.
--   analytical_chromatography (QC/R&D: HPLC/UHPLC columns)
--   reference_standards       (QC: chemical & endotoxin reference standards)
--   water_testing             (QC: PW/WFI/water microbiology)
--   single_use_systems        (upstream bioprocess: bags & assemblies)
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
    'analytical_chromatography', 'reference_standards', 'water_testing',
    'single_use_systems',
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
    'analytical_chromatography', 'reference_standards', 'water_testing',
    'single_use_systems',
    'other'));
