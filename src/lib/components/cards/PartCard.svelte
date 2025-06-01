<script lang="ts">
  import type { UnifiedPart, ManufacturerPartDefinition, SupplierPartDefinition, AttachmentDefinition } from '$lib/types/schemaTypes';
  import { formatDate } from '$lib/utils';
  import { displayJSONData, formatUsername, formatWithUnit } from '$lib/utils/util';
  
  // Props
  export let part: UnifiedPart;

  // Debug - log part data on component initialization
  console.log('PartCard received part data:', {
    'part.part_weight': part.part_weight,
    'part.weight_unit': part.weight_unit,
    'typeof part.part_weight': typeof part.part_weight,
    'JSON.stringify of whole part': JSON.stringify(part)
  });
  
  // Derived values
  $: hasManufacturerData = !!part.manufacturer_name || (part.manufacturer_parts && part.manufacturer_parts.length > 0);
  $: hasSupplierData = !!part.supplier_name || (part.supplier_parts && part.supplier_parts.length > 0);
  $: hasAttachments = part.attachments && part.attachments.length > 0;
  $: hasRepresentations = part.representations && part.representations.length > 0;
  $: hasComplianceInfo = part.compliance_info && part.compliance_info.length > 0;
  $: hasStructure = part.structure && part.structure.length > 0;
  
  $: hasMechanicalProperties = part.mechanical_properties && Object.keys(part.mechanical_properties).some(key => 
    !['package_type', 'mounting_type', 'pin_count', 'dimensions', 'weight', 'weight_unit', 'weight_value', 'dimensions_unit'].includes(key.toLowerCase())
  );
  
  $: hasElectricalProperties = part.electrical_properties && Object.keys(part.electrical_properties).some(key => 
    !['voltage_rating_min', 'voltage_rating_max', 'current_rating_min', 'current_rating_max', 'power_rating_max', 'tolerance', 'tolerance_unit'].includes(key.toLowerCase())
  );
  
  $: hasThermalProperties = part.thermal_properties && Object.keys(part.thermal_properties).some(key => 
    !['operating_temperature_min', 'operating_temperature_max', 'storage_temperature_min', 'storage_temperature_max', 'temperature_unit'].includes(key.toLowerCase())
  );
  
  // Methods for data formatting
  function formatUrl(url: string | undefined | null): string {
    if (!url) return '';
    return url.startsWith('http') ? url : `https://${url}`;
  }
  
  function truncateUrl(url: string | undefined | null, maxLength: number = 30): string {
    if (!url) return '';
    return url.length > maxLength ? url.substring(0, maxLength) + '...' : url;
  }
  
  function formatDescription(description: string | object | null | undefined): string {
    if (!description) return 'Not provided';
    return typeof description === 'string' ? description : JSON.stringify(description);
  }
  
  function filterJSONData(data: Record<string, any> | null | undefined, excludeKeys: string[]): {key: string, value: string}[] {
    if (!data) return [];
    return displayJSONData(data).filter(item => !excludeKeys.includes(item.key.toLowerCase()));
  }
</script>

<div class="part-card">
  <header class="part-header">
    <div class="part-title-area">
      <div class="part-id-section">
        <h1 class="part-name">{part.part_name}</h1>
        <div class="part-identifiers">
          <span class="part-number">{part.global_part_number || 'No Part Number'}</span>
          {#if part.internal_part_number}
            <span class="internal-number">Internal: {part.internal_part_number}</span>
          {/if}
          {#if part.manufacturer_part_number}
            <span class="mpn">MPN: {part.manufacturer_part_number}</span>
          {/if}
        </div>
      </div>
      
      <div class="status-container">
        <div class="status-badges">
          <span class="badge status-badge">{part.status_in_bom}</span>
          <span class="badge lifecycle-badge">{part.lifecycle_status}</span>
          {#if part.is_public}
            <span class="badge public-badge">Public</span>
          {/if}
        </div>
        <div class="metadata">
          <span class="metadata-item">Created: {formatDate(part.created_at)}</span>
          {#if part.updated_at}
            <span class="metadata-item">Updated: {formatDate(part.updated_at)}</span>
          {/if}
        </div>
      </div>
    </div>
    
    {#if part.short_description}
      <div class="part-short-description">
        <p>{part.short_description}</p>
      </div>
    {/if}
    
    {#if part.categories && part.categories.length > 0}
      <div class="part-categories">
        {#each part.categories as category}
          <span class="category-tag">{category.category_name}</span>
        {/each}
      </div>
    {/if}
  </header>

  <!-- Overview Section -->
  <section class="part-section overview-section">
    <div class="section-header">
      <h2>Part Overview</h2>
    </div>
    
    <div class="section-content">
      <div class="overview-grid">
        <div class="overview-column">
          <div class="info-group">
            <h3>Identification</h3>
            <div class="info-table">
              <div class="info-row">
                <div class="info-label">Part Name</div>
                <div class="info-value">{part.part_name}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Version</div>
                <div class="info-value">{part.part_version}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Global Part #</div>
                <div class="info-value">{part.global_part_number || 'Not assigned'}</div>
              </div>
              {#if part.manufacturer_name}
                <div class="info-row">
                  <div class="info-label">Manufacturer</div>
                  <div class="info-value">{part.manufacturer_name}</div>
                </div>
              {/if}
            </div>
          </div>
        </div>
        
        <div class="overview-column">
          <div class="info-group">
            <h3>Status Information</h3>
            <div class="info-table">
              <div class="info-row">
                <div class="info-label">BOM Status</div>
                <div class="info-value status-value">{part.status_in_bom}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Lifecycle</div>
                <div class="info-value lifecycle-value">{part.lifecycle_status}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Visibility</div>
                <div class="info-value">{part.is_public ? 'Public' : 'Private'}</div>
              </div>
              {#if part.released_at}
                <div class="info-row">
                  <div class="info-label">Released</div>
                  <div class="info-value">{formatDate(part.released_at)}</div>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
      
      {#if part.functional_description || part.long_description}
        <div class="part-descriptions">
          {#if part.functional_description}
            <div class="description-block">
              <h3>Functional Description</h3>
              <p>{part.functional_description}</p>
            </div>
          {/if}
          {#if part.long_description}
            <div class="description-block">
              <h3>Detailed Description</h3>
              <p>{formatDescription(part.long_description)}</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </section>
  
  <!-- Technical Specifications -->
  <section class="part-section tech-specs-section">
    <div class="section-header">
      <h2>Technical Specifications</h2>
    </div>
    
    <div class="section-content">
      <div class="specs-container">
        <!-- Left Column - Primary Specs -->
        <div class="specs-column primary-specs">
          <!-- Electrical Properties Card -->
          <div class="spec-card electrical-card">
            <div class="card-header">
              <h3>Electrical</h3>
            </div>
            <div class="card-content">
              <div class="spec-table">
                <div class="spec-row">
                  <div class="spec-label">Voltage Rating</div>
                  <div class="spec-value">
                    {#if part.voltage_rating_min !== undefined && part.voltage_rating_max !== undefined}
                      <span class="spec-range">{part.voltage_rating_min} - {part.voltage_rating_max} V</span>
                    {:else if part.voltage_rating_max !== undefined}
                      <span>Max {part.voltage_rating_max} V</span>
                    {:else}
                      <span class="not-specified">Not specified</span>
                    {/if}
                  </div>
                </div>
                
                <div class="spec-row">
                  <div class="spec-label">Current Rating</div>
                  <div class="spec-value">
                    {#if part.current_rating_min !== undefined && part.current_rating_max !== undefined}
                      <span class="spec-range">{part.current_rating_min} - {part.current_rating_max} A</span>
                    {:else if part.current_rating_max !== undefined}
                      <span>Max {part.current_rating_max} A</span>
                    {:else}
                      <span class="not-specified">Not specified</span>
                    {/if}
                  </div>
                </div>
                
                <div class="spec-row">
                  <div class="spec-label">Power Rating</div>
                  <div class="spec-value">{formatWithUnit(part.power_rating_max, 'W')}</div>
                </div>
                
                <div class="spec-row">
                  <div class="spec-label">Tolerance</div>
                  <div class="spec-value">{formatWithUnit(part.tolerance, part.tolerance_unit)}</div>
                </div>
              </div>
              
              {#if hasElectricalProperties}
                <div class="advanced-specs">
                  <h4>Advanced Electrical Specifications</h4>
                  <div class="property-grid">
                    {#each filterJSONData(part.electrical_properties, [
                      'voltage_rating_min', 'voltage_rating_max', 'current_rating_min',
                      'current_rating_max', 'power_rating_max', 'tolerance', 'tolerance_unit'
                    ]) as { key, value }}
                      <div class="property-item">
                        <div class="property-name">{key}</div>
                        <div class="property-value">{value}</div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Mechanical Properties Card -->
          <div class="spec-card mechanical-card">
            <div class="card-header">
              <h3>Mechanical</h3>
            </div>
            <div class="card-content">
              <div class="spec-table">
                <div class="spec-row">
                  <div class="spec-label">Package Type</div>
                  <div class="spec-value">
                    {#if part.package_type}
                      {part.package_type}
                    {:else}
                      <span class="not-specified">Not specified</span>
                    {/if}
                  </div>
                </div>
                
                <div class="spec-row">
                  <div class="spec-label">Mounting Type</div>
                  <div class="spec-value">
                    {#if part.mounting_type}
                      {part.mounting_type}
                    {:else}
                      <span class="not-specified">Not specified</span>
                    {/if}
                  </div>
                </div>
                
                <div class="spec-row">
                  <div class="spec-label">Pin Count</div>
                  <div class="spec-value">
                    {#if part.pin_count !== undefined}
                      {part.pin_count}
                    {:else}
                      <span class="not-specified">Not specified</span>
                    {/if}
                  </div>
                </div>
                
                {#if part.dimensions}
                  <div class="spec-row">
                    <div class="spec-label">Dimensions</div>
                    <div class="spec-value dimensions-value">
                      {#if part.dimensions.length !== undefined}
                        <span>Length: {part.dimensions.length} {part.dimensions_unit || 'mm'}</span>
                      {/if}
                      {#if part.dimensions.width !== undefined}
                        <span>Width: {part.dimensions.width} {part.dimensions_unit || 'mm'}</span>
                      {/if}
                      {#if part.dimensions.height !== undefined}
                        <span>Height: {part.dimensions.height} {part.dimensions_unit || 'mm'}</span>
                      {/if}
                    </div>
                  </div>
                {/if}
                
                <div class="spec-row">
                  <div class="spec-label">Weight</div>
                  <div class="spec-value">
                    {#if part.part_weight !== undefined}
                      {formatWithUnit(part.part_weight, part.weight_unit)}
                    {:else}
                      <span class="not-specified">Not specified</span>
                    {/if}
                  </div>
                </div>
                
            
              </div>
              
              {#if hasMechanicalProperties}
                <div class="advanced-specs">
                  <h4>Advanced Mechanical Specifications</h4>
                  <div class="property-grid">
                    {#each filterJSONData(part.mechanical_properties, [
                      'package_type', 'mounting_type', 'pin_count', 'dimensions',
                      'weight', 'weight_unit', 'weight_value', 'dimensions_unit'
                    ]) as { key, value }}
                      <div class="property-item">
                        <div class="property-name">{key}</div>
                        <div class="property-value">{value}</div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        </div>
        
        <!-- Right Column - Secondary Specs -->
        <div class="specs-column secondary-specs">
          <!-- Thermal Properties Card -->
          <div class="spec-card thermal-card">
            <div class="card-header">
              <h3>Thermal</h3>
            </div>
            <div class="card-content">
              <div class="spec-table">
                {#if part.operating_temperature_min !== undefined || part.operating_temperature_max !== undefined}
                  <div class="spec-row">
                    <div class="spec-label">Operating Temperature</div>
                    <div class="spec-value">
                      {#if part.operating_temperature_min !== undefined && part.operating_temperature_max !== undefined}
                        <span class="spec-range">{part.operating_temperature_min}° to {part.operating_temperature_max}° {part.temperature_unit || 'C'}</span>
                      {:else if part.operating_temperature_min !== undefined}
                        <span>Min {part.operating_temperature_min}° {part.temperature_unit || 'C'}</span>
                      {:else if part.operating_temperature_max !== undefined}
                        <span>Max {part.operating_temperature_max}° {part.temperature_unit || 'C'}</span>
                      {/if}
                    </div>
                  </div>
                {/if}
                
                {#if part.storage_temperature_min !== undefined || part.storage_temperature_max !== undefined}
                  <div class="spec-row">
                    <div class="spec-label">Storage Temperature</div>
                    <div class="spec-value">
                      {#if part.storage_temperature_min !== undefined && part.storage_temperature_max !== undefined}
                        <span class="spec-range">{part.storage_temperature_min}° to {part.storage_temperature_max}° {part.temperature_unit || 'C'}</span>
                      {:else if part.storage_temperature_min !== undefined}
                        <span>Min {part.storage_temperature_min}° {part.temperature_unit || 'C'}</span>
                      {:else if part.storage_temperature_max !== undefined}
                        <span>Max {part.storage_temperature_max}° {part.temperature_unit || 'C'}</span>
                      {/if}
                    </div>
                  </div>
                {/if}
              </div>
              
              {#if hasThermalProperties}
                <div class="advanced-specs">
                  <h4>Advanced Thermal Specifications</h4>
                  <div class="property-grid">
                    {#each filterJSONData(part.thermal_properties, [
                      'operating_temperature_min', 'operating_temperature_max',
                      'storage_temperature_min', 'storage_temperature_max', 'temperature_unit'
                    ]) as { key, value }}
                      <div class="property-item">
                        <div class="property-name">{key}</div>
                        <div class="property-value">{value}</div>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          </div>
          
          <!-- Materials Card -->
          {#if part.material_composition || part.environmental_data}
            <div class="spec-card materials-card">
              <div class="card-header">
                <h3>Materials & Environmental</h3>
              </div>
              <div class="card-content">
                {#if part.material_composition}
                  <div class="material-composition">
                    <h4>Material Composition</h4>
                    <p>{part.material_composition}</p>
                  </div>
                {/if}
                
                {#if part.environmental_data}
                  <div class="environmental-data">
                    <h4>Environmental Data</h4>
                    <div class="property-grid">
                      {#each displayJSONData(part.environmental_data) as { key, value }}
                        <div class="property-item">
                          <div class="property-name">{key}</div>
                          <div class="property-value">{value}</div>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
          
          <!-- Additional Properties Card -->
          {#if part.properties}
            <div class="spec-card additional-card">
              <div class="card-header">
                <h3>Additional Properties</h3>
              </div>
              <div class="card-content">
                <div class="property-grid">
                  {#each displayJSONData(part.properties) as { key, value }}
                    <div class="property-item">
                      <div class="property-name">{key}</div>
                      <div class="property-value">{value}</div>
                    </div>
                  {/each}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </section>

  <!-- Manufacturer Parts -->
  {#if part.manufacturer_parts && part.manufacturer_parts.length > 0}
    <section class="part-section manufacturer-section">
      <div class="section-header">
        <h2>Manufacturer Parts</h2>
      </div>
      <div class="section-content">
        <div class="table-container">
          <table class="data-table">
          <thead>
            <tr>
              <th>Manufacturer</th>
              <th>Part Number</th>
              <th>Description</th>
              <th>Datasheet</th>
              <th>Product URL</th>
              <th>Recommended</th>
            </tr>
          </thead>
          <tbody>
            {#each part.manufacturer_parts as mp}
              <tr>
                <td>{mp.manufacturer_id}</td>
                <td>{mp.manufacturer_part_number}</td>
                <td>{mp.manufacturer_part_description || '-'}</td>
                <td>
                  {#if mp.datasheet_url}
                    <a href={formatUrl(mp.datasheet_url)} target="_blank" rel="noopener noreferrer">
                      {truncateUrl(mp.datasheet_url, 20)}
                    </a>
                  {:else}
                    -
                  {/if}
                </td>
                <td>
                  {#if mp.product_url}
                    <a href={formatUrl(mp.product_url)} target="_blank" rel="noopener noreferrer">
                      {truncateUrl(mp.product_url, 20)}
                    </a>
                  {:else}
                    -
                  {/if}
                </td>
                <td>{mp.is_recommended ? 'Yes' : 'No'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  {/if}

  <!-- Supplier Parts -->
  {#if part.supplier_parts && part.supplier_parts.length > 0}
    <section class="part-section supplier-section">
      <div class="section-header">
        <h2>Supplier Parts</h2>
      </div>
      <div class="section-content">
        <div class="table-container">
          <table class="data-table">
          <thead>
            <tr>
              <th>Supplier</th>
              <th>Part Number</th>
              <th>Description</th>
              <th>Link</th>
              <th>Price</th>
              <th>Currency</th>
              <th>MOQ</th>
              <th>Lead Time</th>
            </tr>
          </thead>
          <tbody>
            {#each part.supplier_parts as sp}
              <tr>
                <td>{sp.supplier_id}</td>
                <td>{sp.supplier_part_number}</td>
                <td>{sp.spn || '-'}</td>
                <td>
                  {#if sp.product_url}
                    <a href={formatUrl(sp.product_url)} target="_blank" rel="noopener noreferrer">
                      {truncateUrl(sp.product_url, 20)}
                    </a>
                  {:else}
                    -
                  {/if}
                </td>
                <td>{sp.price !== undefined ? sp.price : '-'}</td>
                <td>{sp.currency || '-'}</td>
                <td>{sp.minimum_order_quantity !== undefined ? sp.minimum_order_quantity : '-'}</td>
                <td>{sp.lead_time_days || '-'}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  {/if}

  <!-- Attachments -->
  {#if part.attachments && part.attachments.length > 0}
    <section class="part-section attachment-section">
      <div class="section-header">
        <h2>Attachments</h2>
      </div>
      <div class="section-content">
          <div class="attachment-grid">
            {#each part.attachments as attachment}
              <div class="attachment-item">
                <div class="attachment-icon">
                  <!-- Icon based on file type could go here -->
                  📄
                </div>
                <div class="attachment-details">
                  <p class="attachment-name">{attachment.file_name}</p>
                  <p class="attachment-type">{attachment.file_type}</p>
                  <p class="attachment-description">{attachment.description || '-'}</p>
                </div>
                {#if attachment.file_url}
                  <a href={formatUrl(attachment.file_url)} target="_blank" rel="noopener noreferrer" class="attachment-link">
                    View/Download
                  </a>
                {/if}
              </div>
            {/each}
          </div>
      </div>
    </section>
  {/if}

  <!-- Compliance Information -->
  {#if part.compliance_info && part.compliance_info.length > 0}
    <section class="part-section compliance-section">
      <div class="section-header">
        <h2>Compliance Information</h2>
      </div>
      <div class="section-content">
        <div class="table-container">
          <table class="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Certified Date</th>
              <th>Expiry Date</th>
              <th>Notes</th>
              <th>Certificate</th>
            </tr>
          </thead>
          <tbody>
            {#each part.compliance_info as compliance}
              <tr>
                <td>{compliance.compliance_type}</td>
                <td>{compliance.certified_at ? formatDate(compliance.certified_at) : '-'}</td>
                <td>{compliance.expires_at ? formatDate(compliance.expires_at) : '-'}</td>
                <td>{compliance.notes || '-'}</td>
                <td>
                  {#if compliance.certificate_url}
                    <a href={formatUrl(compliance.certificate_url)} target="_blank" rel="noopener noreferrer">
                      {truncateUrl(compliance.certificate_url, 20)}
                    </a>
                  {:else}
                    -
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  {/if}

  <!-- System Metadata -->
  <section class="part-section system-metadata-section">
    <div class="section-header">
      <h2>System Metadata</h2>
    </div>
    <div class="section-content">
      <div class="grid-2">
        <div>
          <p><strong>Created By:</strong> {formatUsername(part.creator_id)}</p>
          <p><strong>Created On:</strong> {formatDate(part.created_at)}</p>
        </div>
        <div>
          <p><strong>Updated By:</strong> {part.updated_by ? formatUsername(part.updated_by) : 'N/A'}</p>
          <p><strong>Updated On:</strong> {part.updated_at ? formatDate(part.updated_at) : 'N/A'}</p>
        </div>
      </div>
    </div>
  </section>
</div>

<style>
  /* Base Part Card Styles */
  .part-card {
    max-width: 1200px;
    margin: 0 auto;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: hsl(var(--foreground));
    background-color: hsl(var(--background));
  }
  
  /* Part Header Styles */
  .part-header {
    background-color: hsl(var(--card));
    border-radius: 8px 8px 0 0;
    padding: 1.5rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .part-title-area {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .part-id-section {
    flex: 1;
    min-width: 300px;
  }
  
  .part-name {
    font-size: 1.75rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    line-height: 1.2;
    color: hsl(var(--foreground));
  }
  
  .part-identifiers {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }
  
  .part-identifiers > span {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background-color: hsl(var(--muted) / 0.2);
    border-radius: 4px;
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
  }
  
  .part-number {
    font-weight: 500;
  }
  
  .status-container {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }
  
  .status-badges {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  
  .badge {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: 500;
  }
  
  .status-badge {
    background-color: hsl(var(--primary) / 0.15);
    color: hsl(var(--primary));
  }
  
  .lifecycle-badge {
    background-color: hsl(var(--secondary) / 0.15);
    color: hsl(var(--secondary));
  }
  
  .public-badge {
    background-color: hsl(150 50% 50% / 0.15);
    color: hsl(150 50% 40%);
  }
  
  .metadata {
    font-size: 0.8rem;
    color: hsl(var(--muted-foreground));
    display: flex;
    gap: 1rem;
  }
  
  .part-short-description {
    font-size: 1rem;
    line-height: 1.5;
    margin-bottom: 1rem;
    color: hsl(var(--foreground) / 0.8);
    padding: 0.5rem 0;
    border-top: 1px solid hsl(var(--border) / 0.5);
    border-bottom: 1px solid hsl(var(--border) / 0.5);
  }
  
  .part-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .category-tag {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    background-color: hsl(var(--accent) / 0.15);
    color: hsl(var(--accent));
    border-radius: 16px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  /* Section Styles */
  .part-section {
    background-color: hsl(var(--card));
    border-radius: 0;
    margin-bottom: 1.5rem;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }
  
  .part-section:last-child {
    border-radius: 0 0 8px 8px;
  }
  
  .section-header {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid hsl(var(--border));
    background-color: hsl(var(--muted) / 0.1);
  }
  
  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }
  
  .section-content {
    padding: 1.5rem;
  }
  
  /* Overview Grid */
  .overview-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }
  
  @media (max-width: 768px) {
    .grid-2 {
      grid-template-columns: 1fr;
    }
  }
  
  .info-group {
    margin-bottom: 1.5rem;
  }
  
  .info-group h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    color: hsl(var(--foreground));
  }
  
  .info-table {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .info-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .info-label {
    flex: 0 0 40%;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
    font-size: 0.9rem;
  }
  
  .info-value {
    flex: 1;
    color: hsl(var(--foreground));
  }
  
  .status-value {
    color: hsl(var(--primary));
    font-weight: 500;
  }
  
  .lifecycle-value {
    color: hsl(var(--secondary));
    font-weight: 500;
  }
  
  .part-descriptions {
    padding-top: 1rem;
    border-top: 1px solid hsl(var(--border) / 0.5);
  }
  
  .description-block {
    margin-bottom: 1.5rem;
  }
  
  .description-block h3 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: hsl(var(--foreground));
  }
  
  .description-block p {
    margin: 0;
    line-height: 1.6;
    color: hsl(var(--foreground) / 0.9);
  }
  
  /* Specs Container */
  .specs-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }
  
  @media (max-width: 1024px) {
    .specs-container {
      grid-template-columns: 1fr;
    }
  }
  
  .specs-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  /* Spec Cards */
  .spec-card {
    background-color: hsl(var(--background));
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    border: 1px solid hsl(var(--border));
  }
  
  .spec-card .card-header {
    padding: 0.75rem 1rem;
    background-color: hsl(var(--muted) / 0.15);
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .spec-card .card-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }
  
  .spec-card .card-content {
    padding: 1rem;
  }
  
  /* Spec Table */
  .spec-table {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  
  .spec-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .spec-label {
    font-size: 0.85rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
  }
  
  .spec-value {
    font-size: 0.95rem;
    color: hsl(var(--foreground));
  }
  
  .spec-range {
    color: hsl(var(--primary));
    font-weight: 500;
  }
  
  .not-specified {
    color: hsl(var(--muted-foreground) / 0.8);
    font-style: italic;
    font-size: 0.9rem;
  }
  
  .dimensions-value {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  /* Advanced Specs */
  .advanced-specs {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px dashed hsl(var(--border));
  }
  
  .advanced-specs h4 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: hsl(var(--muted-foreground));
  }
  
  .property-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;
  }
  
  .property-item {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding: 0.5rem;
    background-color: hsl(var(--muted) / 0.05);
    border-radius: 4px;
  }
  
  .property-name {
    font-size: 0.8rem;
    font-weight: 500;
    color: hsl(var(--muted-foreground));
  }
  
  .property-value {
    font-size: 0.9rem;
    word-break: break-word;
    color: hsl(var(--foreground));
  }
  
  /* Material & Environmental */
  .material-composition {
    margin-bottom: 1rem;
  }
  
  .material-composition h4,
  .environmental-data h4 {
    font-size: 0.9rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
    color: hsl(var(--muted-foreground));
  }
  
  /* Section Styles */
  .part-section {
    background-color: hsl(var(--card));
    border-radius: 8px;
    margin-bottom: 1.5rem;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
    border: 1px solid hsl(var(--border));
  }
  
  .section-header {
    padding: 1rem 1.5rem;
    background-color: hsl(var(--muted) / 0.15);
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .section-header h2 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: hsl(var(--foreground));
  }
  
  .section-content {
    padding: 1.5rem;
  }
  
  /* Table Styles */
  .table-container {
    width: 100%;
    overflow-x: auto;
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
  }
  
  .data-table th {
    background-color: hsl(var(--muted) / 0.2);
    text-align: left;
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: hsl(var(--foreground));
    border-bottom: 1px solid hsl(var(--border));
  }
  
  .data-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid hsl(var(--border) / 0.5);
    color: hsl(var(--foreground) / 0.9);
  }
  
  .data-table tr:last-child td {
    border-bottom: none;
  }
  
  .data-table tr:nth-child(even) {
    background-color: hsl(var(--muted) / 0.05);
  }
  
  /* System Metadata */
  .system-metadata-section .grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1.5rem;
  }
  
  .system-metadata-section p {
    margin: 0.5rem 0;
  }
  
  /* Attachment Styles */
  .attachment-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }
  
  .attachment-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border: 1px solid hsl(var(--border));
    border-radius: 6px;
    background: hsl(var(--background));
    transition: background-color 0.2s ease;
  }
  
  .attachment-item:hover {
    background-color: hsl(var(--muted) / 0.1);
  }
  
  .attachment-icon {
    flex-shrink: 0;
    font-size: 1.5rem;
    color: hsl(var(--muted-foreground));
  }
  
  .attachment-details {
    flex: 1;
    min-width: 0;
  }
  
  .attachment-name {
    margin: 0 0 0.25rem 0;
    font-weight: 500;
    font-size: 0.95rem;
    color: hsl(var(--foreground));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .attachment-type {
    margin: 0 0 0.25rem 0;
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
  }
  
  .attachment-description {
    margin: 0;
    font-size: 0.85rem;
    color: hsl(var(--foreground) / 0.8);
    line-height: 1.4;
  }
  
  .attachment-link {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.4rem 0.75rem;
    border-radius: 4px;
    background-color: hsl(var(--primary) / 0.1);
    color: hsl(var(--primary));
    font-size: 0.8rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.2s ease;
  }
  
  .attachment-link:hover {
    background-color: hsl(var(--primary) / 0.2);
    text-decoration: none;
  }
  
  /* Link styles */
  a {
    color: hsl(var(--primary));
  }
  
  a:hover {
    text-decoration: underline;
  }
</style>
