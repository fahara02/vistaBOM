<script lang="ts">
  import type { PageData } from './$types';
  import PartCard from '@/components/cards/PartCard.svelte';
  import type { UnifiedPart } from '$lib/types/schemaTypes';
  export let data: PageData;
  
  // Convert the part and currentVersion to a UnifiedPart object
  function createUnifiedPart(part: typeof data.part, currentVersion: typeof data.currentVersion): UnifiedPart {
    return {
      // Core Part data
      part_id: part.part_id,
      creator_id: part.creator_id,
      global_part_number: part.global_part_number,
      status_in_bom: part.status_in_bom,
      lifecycle_status: part.lifecycle_status,
      is_public: part.is_public,
      created_at: part.created_at,
      updated_by: part.updated_by,
      updated_at: part.updated_at,
      current_version_id: part.current_version_id,
      
      // PartVersion data
      part_version_id: currentVersion.part_version_id,
      part_version: currentVersion.part_version,
      part_name: currentVersion.part_name,
      version_status: currentVersion.version_status,
      short_description: currentVersion.short_description,
      long_description: currentVersion.long_description,
      functional_description: currentVersion.functional_description,
      
      // Technical specifications
      technical_specifications: currentVersion.technical_specifications,
      
      // Physical properties
      part_weight: currentVersion.part_weight,
      weight_unit: currentVersion.weight_unit,
      
      dimensions: currentVersion.dimensions,
      dimensions_unit: currentVersion.dimensions_unit,
      package_type: currentVersion.package_type,
      mounting_type: currentVersion.mounting_type,
      pin_count: currentVersion.pin_count,
      
      // Electrical properties
      voltage_rating_min: currentVersion.voltage_rating_min,
      voltage_rating_max: currentVersion.voltage_rating_max,
      current_rating_min: currentVersion.current_rating_min,
      current_rating_max: currentVersion.current_rating_max,
      power_rating_max: currentVersion.power_rating_max,
      tolerance: currentVersion.tolerance,
      tolerance_unit: currentVersion.tolerance_unit,
      electrical_properties: currentVersion.electrical_properties,
      
      // Mechanical & thermal properties
      mechanical_properties: currentVersion.mechanical_properties,
      thermal_properties: currentVersion.thermal_properties,
      
      // Empty arrays for relationships (these would need to be loaded separately)
      manufacturer_parts: [],
      supplier_parts: [],
      attachments: [],
      representations: [],
      structure: [],
      compliance_info: []
    } as UnifiedPart;
  }
  
  const unifiedPart = createUnifiedPart(data.part, data.currentVersion);
</script>

<svelte:head>
  <title>Part {data.part.global_part_number || data.part.part_id}</title>
</svelte:head>

<PartCard part={unifiedPart} />
