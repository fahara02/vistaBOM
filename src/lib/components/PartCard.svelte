<script lang="ts">
  import type { Part, PartVersion } from '$lib/types';
  import { formatDate } from '$lib/utils';
  export let part: Part;
  export let currentVersion: PartVersion;

  // Helper function to format values with units
  function formatWithUnit(value: number | null | undefined, unit: string | null | undefined, defaultText = 'Not specified'): string {
    if (value === null || value === undefined) return defaultText;
    return `${value}${unit ? ` ${unit}` : ''}`;
  }

  // Function to display JSON data in a readable format
  function displayJSONData(jsonData: any): { key: string, value: string }[] {
    if (!jsonData) return [];
    
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      return Object.entries(data).map(([key, value]) => ({
        key: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: typeof value === 'object' ? JSON.stringify(value) : String(value)
      }));
    } catch (e) {
      console.error('Error parsing JSON data:', e);
      return [];
    }
  }

  // Function to format creator/updater name
  function formatUsername(userId: string | null | undefined): string {
    if (!userId) return 'System';
    // In a real app, you would look up the username from the user ID
    // For now, we'll just show a formatted version
    return `User ${userId.substring(0, 8)}`;
  }

//   // Safely get family/category from part or version
//   function getCategory(): string {
//     return part.category || 'Not specified';
//   }
  
//   function getFamily(): string {
//     return part.family || 'Not specified';
//   }
</script>

<div class="part-card">
  <header class="card-header">
    <h1>{currentVersion.name} <span class="part-number">{part.globalPartNumber || 'No Part Number'}</span></h1>
    <div class="status-badges">
      <span class="badge status-badge">{part.status}</span>
      <span class="badge lifecycle-badge">{part.lifecycleStatus}</span>
      {#if part.isPublic}
        <span class="badge public-badge">Public</span>
      {/if}
    </div>
  </header>

  <!-- Basic Information -->
  <section class="card basic-info">
    <h2>Basic Information</h2>
    <div class="grid-2">
      <div>
        <p><strong>Name:</strong> {currentVersion.name}</p>
        <p><strong>Version:</strong> {currentVersion.version}</p>
        <p><strong>Global Part Number:</strong> {part.globalPartNumber || 'Not assigned'}</p>
        <!-- <p><strong>Category:</strong> {getCategory()}</p> -->
      </div>
      <div>
        <p><strong>Status:</strong> {part.status}</p>
        <p><strong>Lifecycle Status:</strong> {part.lifecycleStatus}</p>
        <p><strong>Public:</strong> {part.isPublic ? 'Yes' : 'No'}</p>
        <!-- <p><strong>Family:</strong> {getFamily()}</p> -->
      </div>
    </div>
    {#if currentVersion.shortDescription}
      <div class="description">
        <h3>Short Description</h3>
        <p>{currentVersion.shortDescription}</p>
      </div>
    {/if}
    {#if currentVersion.functionalDescription}
      <div class="description">
        <h3>Functional Description</h3>
        <p>{currentVersion.functionalDescription}</p>
      </div>
    {/if}
    {#if currentVersion.longDescription}
      <div class="description">
        <h3>Detailed Description</h3>
        <p>{currentVersion.longDescription}</p>
      </div>
    {/if}
  </section>
  
    <!-- Technical Specifications -->
    <section class="card tech-specs">
      <h2>Technical Specifications</h2>
      
      <!-- Electrical Properties -->
      <div class="subsection">
        <h3>Electrical Properties</h3>
        <div class="tech-grid">
          <p><strong>Voltage Rating:</strong> 
            {#if currentVersion.voltageRatingMin !== undefined && currentVersion.voltageRatingMax !== undefined}
              {currentVersion.voltageRatingMin}V - {currentVersion.voltageRatingMax}V
            {:else if currentVersion.voltageRatingMax !== undefined}
              Max {currentVersion.voltageRatingMax}V
            {:else}
              Not specified
            {/if}
          </p>
          <p><strong>Current Rating:</strong> 
            {#if currentVersion.currentRatingMin !== undefined && currentVersion.currentRatingMax !== undefined}
              {currentVersion.currentRatingMin}A - {currentVersion.currentRatingMax}A
            {:else if currentVersion.currentRatingMax !== undefined}
              Max {currentVersion.currentRatingMax}A
            {:else}
              Not specified
            {/if}
          </p>
          <p><strong>Power Rating:</strong> {formatWithUnit(currentVersion.powerRatingMax, 'W')}</p>
          <p><strong>Tolerance:</strong> {formatWithUnit(currentVersion.tolerance, currentVersion.toleranceUnit)}</p>
          
         
        </div>
        
        {#if currentVersion.electricalProperties}
          <div class="json-data-section">
            <h4>Additional Electrical Properties</h4>
            <div class="json-data-grid">
              {#each displayJSONData(currentVersion.electricalProperties) as { key, value }}
                <div class="json-data-item">
                  <div class="json-data-key">{key}:</div>
                  <div class="json-data-value">{value}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
  
      <!-- Mechanical Properties -->
      <div class="subsection">
        <h3>Mechanical Properties</h3>
        <div class="tech-grid">
          <p><strong>Package Type:</strong> {currentVersion.packageType || 'Not specified'}</p>
          <p><strong>Pin Count:</strong> {currentVersion.pinCount !== undefined ? currentVersion.pinCount : 'Not specified'}</p>
          <!-- <p><strong>Mounting Type:</strong> {currentVersion.mountingType || 'Not specified'}</p> -->
        </div>
        
        <!-- Dimensions -->
        {#if currentVersion.dimensions}
          <div class="json-data-section">
            <h4>Dimensions</h4>
            <div class="json-data-grid">
              {#each displayJSONData(currentVersion.dimensions) as { key, value }}
                <div class="json-data-item">
                  <div class="json-data-key">{key}:</div>
                  <div class="json-data-value">{value}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        {#if currentVersion.mechanicalProperties}
          <div class="json-data-section">
            <h4>Additional Mechanical Properties</h4>
            <div class="json-data-grid">
              {#each displayJSONData(currentVersion.mechanicalProperties) as { key, value }}
                <div class="json-data-item">
                  <div class="json-data-key">{key}:</div>
                  <div class="json-data-value">{value}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
  
      <!-- Thermal Properties -->
      <div class="subsection">
        <h3>Thermal Properties</h3>
        <div class="tech-grid">
          {#if currentVersion.operatingTemperatureMin !== undefined || currentVersion.operatingTemperatureMax !== undefined}
            <p><strong>Operating Temperature:</strong> 
              {#if currentVersion.operatingTemperatureMin !== undefined && currentVersion.operatingTemperatureMax !== undefined}
                {currentVersion.operatingTemperatureMin}°C to {currentVersion.operatingTemperatureMax}°C
              {:else if currentVersion.operatingTemperatureMin !== undefined}
                Min {currentVersion.operatingTemperatureMin}°C
              {:else if currentVersion.operatingTemperatureMax !== undefined}
                Max {currentVersion.operatingTemperatureMax}°C
              {:else}
                Not specified
              {/if}
            </p>
          {/if}
          <!-- <p><strong>Thermal Resistance:</strong> {formatWithUnit(currentVersion.thermalResistance, '°C/W')}</p> -->
        </div>
        
        {#if currentVersion.thermalProperties}
          <div class="json-data-section">
            <h4>Additional Thermal Properties</h4>
            <div class="json-data-grid">
              {#each displayJSONData(currentVersion.thermalProperties) as { key, value }}
                <div class="json-data-item">
                  <div class="json-data-key">{key}:</div>
                  <div class="json-data-value">{value}</div>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
  
      <!-- Additional Properties -->
      {#if currentVersion.materialComposition || currentVersion.properties || currentVersion.environmentalData}
        <div class="subsection">
          <h3>Additional Properties</h3>
          
          {#if currentVersion.materialComposition}
            <div class="json-data-section">
              <h4>Material Composition</h4>
              <div class="json-data-grid">
                {#each displayJSONData(currentVersion.materialComposition) as { key, value }}
                  <div class="json-data-item">
                    <div class="json-data-key">{key}:</div>
                    <div class="json-data-value">{value}</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if currentVersion.properties}
            <div class="json-data-section">
              <h4>Other Properties</h4>
              <div class="json-data-grid">
                {#each displayJSONData(currentVersion.properties) as { key, value }}
                  <div class="json-data-item">
                    <div class="json-data-key">{key}:</div>
                    <div class="json-data-value">{value}</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          
          {#if currentVersion.environmentalData}
            <div class="json-data-section">
              <h4>Environmental Data</h4>
              <div class="json-data-grid">
                {#each displayJSONData(currentVersion.environmentalData) as { key, value }}
                  <div class="json-data-item">
                    <div class="json-data-key">{key}:</div>
                    <div class="json-data-value">{value}</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </section>
  
    <!-- System & Metadata (Removed sensitive IDs) -->
    <section class="card system-metadata">
      <h2>System Information</h2>
      <div class="grid-2">
        <div>
          <p><strong>Created:</strong> {formatDate(part.createdAt)}</p>
          <p><strong>Created By:</strong> {formatUsername(part.creatorId)}</p>
        </div>
        <div>
          <p><strong>Last Updated:</strong> {formatDate(part.updatedAt)}</p>
          <p><strong>Updated By:</strong> {formatUsername(part.updatedBy)}</p>
        </div>
      </div>
    </section>
  
    <nav class="actions">
      <a href="/parts/{part.id}/edit" class="btn">Edit</a>
      <a href="/parts" class="btn btn-secondary">Back to Parts</a>
      <form method="POST" action="?delete">
        <button type="submit" class="btn btn-danger">Delete</button>
      </form>
    </nav>
  </div>
  
  <style>
    .part-card { max-width: 960px; margin: 1rem auto; color: #333; }
    
    .card-header {
      margin-bottom: 1.5rem;
    }
    
    h1 {
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }
    
    .part-number {
      font-size: 1rem;
      color: #666;
      font-weight: normal;
    }
    
    .status-badges {
      display: flex;
      gap: 0.5rem;
      margin: 0.5rem 0;
    }
    
    .badge {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    
    .status-badge {
      background-color: #007bff;
      color: white;
    }
    
    .lifecycle-badge {
      background-color: #6c757d;
      color: white;
    }
    
    .public-badge {
      background-color: #28a745;
      color: white;
    }
    
    .card { 
      padding: 1.5rem; 
      margin-bottom: 1.5rem; 
      border: 1px solid #e0e0e0; 
      border-radius: 8px; 
      background: #fff; 
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }
    
    h2 {
      font-size: 1.4rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #e0e0e0;
    }
    
    h3 {
      font-size: 1.2rem;
      margin: 1rem 0 0.75rem 0;
      color: #555;
    }
    
    h4 {
      font-size: 1.1rem;
      margin: 0.75rem 0;
      color: #666;
    }
    
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    
    .tech-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 0.5rem 1.5rem;
    }
    
    @media (max-width: 768px) {
      .grid-2, .tech-grid {
        grid-template-columns: 1fr;
      }
    }
    
    .subsection {
      margin-bottom: 2rem;
      border-bottom: 1px dashed #e0e0e0;
      padding-bottom: 1rem;
    }
    
    .subsection:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    p {
      margin: 0.5rem 0;
      line-height: 1.5;
    }
    
    strong {
      font-weight: 600;
      color: #444;
    }
    
    .json-data-section {
      background-color: #f8f9fa;
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin: 1rem 0;
    }
    
    .json-data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 0.5rem 1.5rem;
    }
    
    .json-data-item {
      display: flex;
      margin: 0.3rem 0;
    }
    
    .json-data-key {
      font-weight: 500;
      min-width: 120px;
      color: #555;
    }
    
    .json-data-value {
      flex: 1;
      word-break: break-word;
    }
    
    .description {
      background: #f9f9ff;
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin: 1rem 0;
    }
    
    .system-metadata {
      background: #f9f9f9;
    }
    
    .tech-specs, .basic-info {
      background: #ffffff;
    }
    
    .actions { 
      display: flex; 
      gap: 1rem; 
      margin-top: 2rem;
    }
    
    .btn { 
      background: #007bff; 
      color: #fff; 
      padding: 0.6rem 1.2rem; 
      border: none; 
      border-radius: 4px; 
      text-decoration: none; 
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    
    .btn:hover {
      background: #0069d9;
    }
    
    .btn-secondary {
      background: #6c757d;
    }
    
    .btn-secondary:hover {
      background: #5a6268;
    }
    
    .btn-danger { 
      background: #dc3545; 
    }
    
    .btn-danger:hover {
      background: #c82333;
    }
  </style>