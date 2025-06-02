<script lang="ts">
  import type { PageData } from './$types';
  import PartCard from '@/components/cards/PartCard.svelte';
  import type { UnifiedPart, ManufacturerPartDefinition } from '$lib/types/schemaTypes';
  import type { Part, PartVersion } from '$lib/types';
  export let data: PageData;
  
  // Define a type with the extra properties that we know exist on currentVersion
  // This follows the project type extension pattern:
  // "For extended types, use intersection: export let entity: Entity & { parent_name?: string }"
  type ExtendedVersion = PartVersion & {
    category_ids?: string[] | string;
    manufacturer_parts?: ManufacturerPartDefinition[];
  }
  
  // Convert the part and currentVersion to a UnifiedPart object
  function createUnifiedPart(part: Part, currentVersion: ExtendedVersion): UnifiedPart {
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
      
      // These would be overwritten with empty arrays, but we need to preserve the data from backend
      category_ids: currentVersion.category_ids,
      manufacturer_parts: currentVersion.manufacturer_parts,
      supplier_parts: [],
      attachments: [],
      representations: [],
      structure: [],
      compliance_info: []
    } as UnifiedPart;
  }
  
  // Cast the currentVersion to our extended type to ensure TypeScript recognizes the properties
  const typedCurrentVersion = data.currentVersion as ExtendedVersion;
  
  // Console log to verify data coming from the server
  console.log('Part data from server:', {
    'data.part': data.part,
    'data.currentVersion': typedCurrentVersion,
    'data.currentVersion.category_ids': typedCurrentVersion.category_ids,
    'data.currentVersion.manufacturer_parts': typedCurrentVersion.manufacturer_parts
  });

  const unifiedPart = createUnifiedPart(data.part, typedCurrentVersion);
</script>

<svelte:head>
  <title>Part {data.part.global_part_number || data.part.part_id}</title>
</svelte:head>

<PartCard part={unifiedPart} />
