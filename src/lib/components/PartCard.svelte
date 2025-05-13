<script lang="ts">
  import type { Part, PartVersion } from '@/types/types';
  import { formatDate } from '$lib/utils';
	import { displayJSONData, formatUsername, formatWithUnit } from '@/utils/util';
  export let part: Part;
  export let currentVersion: PartVersion;

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
    .part-card { 
      max-width: 960px; 
      margin: 1rem auto; 
      color: hsl(var(--foreground)); 
      transition: color 0.3s, background-color 0.3s;
    }
    
    .card-header {
      margin-bottom: 1.5rem;
    }
    
    h1 {
      font-size: 1.8rem;
      margin-bottom: 0.5rem;
    }
    
    .part-number {
      font-size: 1rem;
      color: hsl(var(--muted-foreground));
      font-weight: normal;
      transition: color 0.3s;
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
      background-color: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      transition: background-color 0.3s, color 0.3s;
    }
    
    .lifecycle-badge {
      background-color: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
      transition: background-color 0.3s, color 0.3s;
    }
    
    .public-badge {
      background-color: hsl(var(--success));
      color: hsl(var(--success-foreground));
      transition: background-color 0.3s, color 0.3s;
    }
    
    .card { 
      padding: 1.5rem; 
      margin-bottom: 1.5rem; 
      border: 1px solid hsl(var(--border)); 
      border-radius: 8px; 
      background: hsl(var(--card)); 
      box-shadow: 0 2px 4px hsl(var(--muted) / 0.1);
      transition: background-color 0.3s, border-color 0.3s, box-shadow 0.3s;
    }
    
    h2 {
      font-size: 1.4rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid hsl(var(--border));
      color: hsl(var(--foreground));
      transition: color 0.3s, border-color 0.3s;
    }
    
    h3 {
      font-size: 1.2rem;
      margin: 1rem 0 0.75rem 0;
      color: hsl(var(--foreground));
      transition: color 0.3s;
    }
    
    h4 {
      font-size: 1.1rem;
      margin: 0.75rem 0;
      color: hsl(var(--muted-foreground));
      transition: color 0.3s;
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
      border-bottom: 1px dashed hsl(var(--border));
      padding-bottom: 1rem;
      transition: border-color 0.3s;
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
      color: hsl(var(--foreground));
      transition: color 0.3s;
    }
    
    .json-data-section {
      background-color: hsl(var(--muted) / 0.3);
      border-radius: 6px;
      padding: 0.75rem 1rem;
      margin: 1rem 0;
      transition: background-color 0.3s;
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
      color: hsl(var(--foreground));
      transition: color 0.3s;
    }
    
    .json-data-value {
      flex: 1;
      word-break: break-word;
    }
    
    .description {
      background: hsl(var(--accent) / 0.1);
      padding: 0.75rem 1rem;
      border-radius: 4px;
      margin: 1rem 0;
      transition: background-color 0.3s;
    }
    
    .system-metadata {
      background: hsl(var(--surface-50));
      transition: background-color 0.3s;
    }
    
    .tech-specs, .basic-info {
      background: hsl(var(--card));
      transition: background-color 0.3s;
    }
    
    .actions { 
      display: flex; 
      gap: 1rem; 
      margin-top: 2rem;
    }
    
    .btn { 
      background: hsl(var(--primary)); 
      color: hsl(var(--primary-foreground)); 
      padding: 0.6rem 1.2rem; 
      border: none; 
      border-radius: 4px; 
      text-decoration: none; 
      font-weight: 500;
      cursor: pointer;
      transition: background-color 0.3s, color 0.3s, transform 0.2s;
    }
    
    .btn:hover {
      background: hsl(var(--primary) / 0.9);
      transform: translateY(-1px);
    }
    
    .btn-secondary {
      background: hsl(var(--secondary));
      color: hsl(var(--secondary-foreground));
    }
    
    .btn-secondary:hover {
      background: hsl(var(--secondary) / 0.9);
    }
    
    .btn-danger { 
      background: hsl(var(--destructive)); 
      color: hsl(var(--destructive-foreground));
    }
    
    .btn-danger:hover {
      background: hsl(var(--destructive) / 0.9);
    }
  </style>