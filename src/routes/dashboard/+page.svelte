<script lang="ts">
	import { goto } from '$app/navigation';
	import { PartForm } from '$lib/components';
	import CategoryComboBox from '$lib/components/CategoryComboBox.svelte';
	import Category from '$lib/components/category.svelte';
	import type { Category as CategoryType } from '@/types/types';
	import { LifecycleStatusEnum, PartStatusEnum } from '@/types/types';
	import { superForm } from 'sveltekit-superforms/client';
	import type { PageData } from './$types';

	export let data: PageData;
	const user = data.user!;
	const projects = data.projects;

	// Ensure fullName is a string for rendering
	const fullName = user.full_name ?? '';
	const initial = fullName.charAt(0) || '';

	// Tab management
	type TabType = 'projects' | 'parts' | 'manufacturers' | 'suppliers' | 'categories';
	let activeTab: TabType = 'projects';
	
	// Form visibility toggles
	let showPartForm = false;
	let showManufacturerForm = false;
	let showSupplierForm = false;
	let showCategoryForm = false;

	// Format field names from camelCase to Title Case with spaces
	function formatFieldName(fieldName: string): string {
		// Add space before capital letters and capitalize the first letter
		const formatted = fieldName
			.replace(/([A-Z])/g, ' $1') // Add space before capital letters
			.replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter
		return formatted.trim();
	}
	
	// // Process contact info for dashboard display
	function processContactInfo(info: any): { email?: string; phone?: string; address?: string; text?: string } {
		const result: { email?: string; phone?: string; address?: string; text?: string } = {};
		
		if (!info) return result;
		
		// If it's already a parsed object, just return it
		if (typeof info === 'object' && info !== null) {
			if ('email' in info) result.email = info.email;
			if ('phone' in info) result.phone = info.phone;
			if ('address' in info) result.address = info.address;
			return result;
		}
		
		// If it's a string, try to parse it as JSON
		if (typeof info === 'string') {
			try {
				// Try JSON parsing first
				if (info.trim().startsWith('{')) {
					const parsed = JSON.parse(info);
					if ('email' in parsed) result.email = parsed.email;
					if ('phone' in parsed) result.phone = parsed.phone;
					if ('address' in parsed) result.address = parsed.address;
					return result;
				}
				
				// Look for email:value format
				if (info.includes(':')) {
					const pairs = info.split(/[;,\n]+/);
					
					for (const pair of pairs) {
						const parts = pair.split(':');
						if (parts.length >= 2) {
							const key = parts[0].trim().toLowerCase();
							const value = parts.slice(1).join(':').trim();
							
							if (key.includes('email')) result.email = value;
							else if (key.includes('phone') || key.includes('tel')) result.phone = value;
							else if (key.includes('address')) result.address = value;
						}
					}
					
					if (Object.keys(result).length > 0) return result;
				}
				
				// Default to storing as simple text
				result.text = info;
				return result;
			} catch (e) {
				// If JSON parsing fails, just store as text
				result.text = info;
				return result;
			}
		}
		
		return result;
	}

	// Function to handle tab changes
	function setActiveTab(tab: TabType): void {
		activeTab = tab;
	}
	
	// Reference to the form element for form submission
	let partFormElement: HTMLFormElement;
	
	// Function to toggle part form visibility
	function togglePartForm(): void {
		showPartForm = !showPartForm;
		
		// If we're closing the form, reset the form data to prevent stale data issues
		if (!showPartForm) {
			// Reset the part form to default values with proper enum values
			// Use proper schema field names matching the createPartSchema
			$partForm = {
				part_name: '',
				part_version: '0.1.0',
				short_description: '',
				// Use proper enum values to ensure type safety
				version_status: LifecycleStatusEnum.DRAFT,
				status_in_bom: PartStatusEnum.CONCEPT,
				// Required fields
				is_public: false,
				compliance_info: [],
				attachments: [],
				representations: [],
				technical_specifications: {},
				// Note: properties is handled via technical_specifications
				custom_fields: {},
				// Required fields from schema
				structure: [],
				manufacturer_parts: [],
				supplier_parts: []
			};
		}
		
		console.log("Part form is " + (showPartForm ? "showing" : "hidden"));
	}
	
	// Update form data when the PartForm component changes
	function updateFormData(event: CustomEvent) {
		const formData = event.detail;
		console.log('📦 Received form update from PartForm:', formData);
		
		// Update the SuperForm store with the new data
		$partForm = { ...$partForm, ...formData };
	}
	
	// All categories data for ComboBox in both create and edit forms
	let allCategories: CategoryType[] = [];

	// Initialize part form with superForm with improved error handling
	const { form: partForm, errors: partErrors, enhance: partEnhance, submitting: partSubmitting, message: partMessage } = superForm(data.partForm, {
		dataType: 'json',
		resetForm: false, // Keep form values on submission
		onSubmit: ({ formData }) => {
			console.log('Submitting part form with data:', formData);
			
			// Make sure enum fields with empty values are properly handled
			// Update enum field names to match the schema
			const enumFields = ['status', 'part_status', 'package_type', 'weight_unit', 'dimensions_unit', 'temperature_unit'];
			enumFields.forEach(field => {
				if (formData.has(field)) {
					const value = formData.get(field);
					if (value === '' || value === undefined) {
						// Remove empty enum fields instead of setting to null
						// This avoids FormData type issues with null values
						formData.delete(field);
					}
				}
			});
		},
		onResult: ({ result }) => {
			console.log('Part form submission result:', result);
			
			// Check if the submission was successful
			if (result.type === 'success') {
				// Show success message
				$partMessage = 'Part created successfully!';
				
				// Hide the form
				showPartForm = false;
				
				// Reload the page to get updated parts list
				setTimeout(() => {
					window.location.reload();
				}, 1000); // Short delay to show the success message
			} else if (result.type === 'error') {
				// Show error message
				$partMessage = 'Failed to create part. Please check the form for errors.';
				console.error('Part form submission error:', result.error);
			}
		},
		onError: (error) => {
			// Handle validation errors
			console.error('Part form validation error:', error);
			$partMessage = 'Form validation failed. Please check the highlighted fields.';
		}
	});

	// Initialize manufacturer form with superForm
	const { form: manufacturerForm, errors: manufacturerErrors, enhance: manufacturerEnhance, submitting: manufacturerSubmitting, message: manufacturerMessage } = superForm(data.manufacturerForm, {
		dataType: 'json',
		resetForm: false, // Keep form values on submission
		onSubmit: () => {
			console.log('Submitting manufacturer form');
		},
		onResult: ({ result }) => {
			if (result.type === 'success') {
				// Successfully submitted, hide form after a delay
				setTimeout(() => {
					showManufacturerForm = false;
				}, 2000); // Delay to allow user to see success message
			}
		}
	});

	// Initialize category form with superForm
	const { form: categoryForm, errors: categoryErrors, enhance: categoryEnhance, submitting: categorySubmitting, message: categoryMessage } = superForm(data.categoryForm, {
		dataType: 'json',
		onResult: ({ result }) => {
			// Handle successful submission
			if (result.type === 'success') {
				showCategoryForm = false;
				// Reload the page to get updated categories list
				window.location.reload();
			}
			// Don't reset the form on error to preserve user input
		}
	});

	// Initialize supplier form with superForm
	const { form: supplierForm, errors: supplierErrors, enhance: supplierEnhance, submitting: supplierSubmitting, message: supplierMessage } = superForm(data.supplierForm, {
		dataType: 'form',
		resetForm: true,
		onResult: ({ result }) => {
			if (result.type === 'success') {
				// Close the form
				showCategoryForm = false;
				
				// Reset edit mode
				editCategoryMode = false;
				currentCategoryId = null;
				
				// Reset the form to initial values
				// Form will be reset automatically due to resetForm: true
				
				// Display a success message
				$categoryMessage = editCategoryMode ? 'Category updated successfully!' : 'Category created successfully!';
				
				// Reload the page to refresh data
				setTimeout(() => {
					window.location.reload();
				}, 500);
			}
		}
	});

	// User entities from server
	const userParts = data.userParts || [];
	const userManufacturers = data.userManufacturers || [];
	const userSuppliers = data.userSuppliers || [];
	const userCategories = data.userCategories || [];
	const categories = data.categories || [];

	// Edit mode tracking
	let editCategoryMode = false;
	let currentCategoryId: string | null = null;
	
	// Function to handle edit button click
	function editCategory(category: any) {
		// Set category ID being edited
		currentCategoryId = category.category_id;
		
		// Populate form with category data
		$categoryForm = {
			category_name: category.category_name,
			category_description: category.category_description || '',
			parent_id: category.parent_id || '',
			is_public: Boolean(category.is_public)
		};
		
		// Find and display the parent category by name in the allCategories list
		// This ensures the CategoryComboBox displays parent names correctly
		// Already handled by the CategoryComboBox component with the parent_name field
		
		// Show form and set edit mode
		showCategoryForm = true;
		editCategoryMode = true;
	}
	
	// Function to cancel editing
	function cancelCategoryEdit() {
		// Reset edit mode flags
		editCategoryMode = false;
		currentCategoryId = null;
		showCategoryForm = false;
		
		// Reset form to initial state
		$categoryForm = {
			category_name: '',
			category_description: '',
			parent_id: '',
			is_public: false
		};
	}
	
	// Function to toggle category form visibility
	function toggleCategoryForm() {
		// If we're closing the form and in edit mode, cancel the edit
		if (showCategoryForm && editCategoryMode) {
			cancelCategoryEdit();
		} else {
			// If we're opening the form for a new category, reset edit mode
			if (!showCategoryForm) {
				editCategoryMode = false;
				currentCategoryId = null;
				// Reset form
				$categoryForm = {
					category_name: '',
					category_description: '',
					parent_id: '',
					is_public: false
				};
			}
			
			// Toggle form visibility
			showCategoryForm = !showCategoryForm;
		}
	}
</script>

<div class="dashboard-container">
	<header class="dashboard-header">
		<div class="user-info">
			{#if user.avatar_url}
				<img class="avatar" src={user.avatar_url} alt="Avatar" />
			{:else}
				<div class="avatar-placeholder">{initial}</div>
			{/if}
			<div class="user-details">
				<h1 class="welcome">Welcome, {fullName}</h1>
				<button class="logout-button" on:click={() => goto('/logout')}>Logout</button>
			</div>
		</div>
	</header>

	<div class="dashboard-tabs">
		<button 
			class="tab-button {activeTab === 'projects' ? 'active' : ''}" 
			on:click={() => setActiveTab('projects')}
		>
			Projects
		</button>
		<button 
			class="tab-button {activeTab === 'parts' ? 'active' : ''}" 
			on:click={() => setActiveTab('parts')}
		>
			Parts
		</button>
		<button 
			class="tab-button {activeTab === 'manufacturers' ? 'active' : ''}" 
			on:click={() => setActiveTab('manufacturers')}
		>
			Manufacturers
		</button>
		<button 
			class="tab-button {activeTab === 'suppliers' ? 'active' : ''}" 
			on:click={() => setActiveTab('suppliers')}
		>
			Suppliers
		</button>
		<button 
			class="tab-button {activeTab === 'categories' ? 'active' : ''}" 
			on:click={() => setActiveTab('categories')}
		>
			Categories
		</button>
	</div>

	<section class="dashboard-content">
		<!-- Projects Tab -->
		{#if activeTab === 'projects'}
			<div class="tab-content">
				<h2>Your Projects</h2>
				{#if projects.length > 0}
					<ul class="projects-grid">
						{#each projects as project (project.project_id)}
							<li class="project-card">
								<a class="project-link" href={`/dashboard/${project.project_id}`}>{project.project_name}</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="no-items">You have no projects yet.</p>
				{/if}

				<h2>Add New Project</h2>
				<form class="project-form" method="POST" action="?/project">
					<input class="project-input" type="text" name="name" placeholder="Project Name" required />
					<button class="primary-btn" type="submit">Add Project</button>
				</form>
			</div>
		{/if}

		<!-- Parts Tab -->
		{#if activeTab === 'parts'}
			<div class="tab-content">
				<h2>Your Parts</h2>
				{#if userParts.length > 0}
					<div class="user-items-grid">
						{#each userParts as part (part.part_id)}
							<div class="entity-card">
								<h3>{(part as any).name || 'Unnamed Part'}</h3>
								<p class="entity-meta">Version: {(part as any).part_version || '1.0.0'}</p>
								<p class="entity-meta">Status: {part.lifecycle_status || 'Draft'}</p>
								<div class="entity-actions">
									<a href={`/parts/${part.part_id}`} class="icon-btn view-btn" title="View Part Details">👁️</a>
									<a href={`/parts/${part.part_id}/edit`} class="icon-btn edit-btn" title="Edit Part">✏️</a>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="no-items">You haven't created any parts yet.</p>
				{/if}

				<div class="action-buttons">
					<button type="button" class="primary-btn" on:click={togglePartForm}>
						{showPartForm ? 'Cancel' : 'Add New Part'}
					</button>
					<a href="/parts" class="secondary-btn">View All Parts</a>
				</div>

				{#if showPartForm}
					<div class="form-container">
						<h2>Create New Part</h2>
						
						{#if $partMessage}
							<div class="form-message {typeof $partMessage === 'string' && $partMessage.includes('Failed') ? 'error' : 'success'}">
								{$partMessage}
							</div>
						{/if}
						
						<div class="embedded-form">
							<!-- Using bind:this to capture form element reference -->
							<form method="POST" action="?/part" use:partEnhance bind:this={partFormElement}>
								<!-- Hidden fields to capture form data from PartForm component -->
								{#each Object.entries($partForm) as [key, value]}
									{#if typeof value !== 'object' || value === null}
										<input type="hidden" name={key} value={value ?? ''} />
									{:else if key === 'dimensions' && value !== null}
										<!-- Handle dimensions object specially -->
										<input type="hidden" name="dimensions" value={JSON.stringify(value)} />
									{:else if typeof value === 'object'}
										<!-- Handle other object values -->
										<input type="hidden" name={key} value={JSON.stringify(value)} />
									{/if}
								{/each}

								<PartForm 
									categories={categories || []}
									errors={$partErrors as Record<string, any>}
									data={{ partForm: $partForm }}
									hideButtons={false}
									isDashboardContext={true}
									isEditMode={false}
									on:formUpdate={updateFormData}
								/>
								
								<div class="form-actions">
									<button type="submit" class="primary-btn" disabled={$partSubmitting}>
										{$partSubmitting ? 'Creating...' : 'Create Part'}
									</button>
									<button type="button" class="secondary-btn" on:click={togglePartForm}>Cancel</button>
								</div>
							</form>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Manufacturers Tab -->
		{#if activeTab === 'manufacturers'}
			<div class="tab-content">
				<h2>Your Manufacturers</h2>
				{#if userManufacturers.length > 0}
					<div class="user-items-grid">
						{#each userManufacturers as manufacturer (manufacturer.manufacturer_id)}
							<div class="entity-card manufacturer-card">
								<div class="card-header">
									{#if manufacturer.logo_url}
										<div class="logo-container">
											<img src={manufacturer.logo_url} alt={`${manufacturer.manufacturer_name} logo`} class="manufacturer-logo" />
										</div>
									{:else}
										<div class="logo-placeholder">
											<span>{manufacturer.manufacturer_name.substring(0, 2).toUpperCase()}</span>
										</div>
									{/if}
									<h3 class="manufacturer-name">{manufacturer.manufacturer_name}</h3>
								</div>
								
								<div class="card-content">
									{#if manufacturer.manufacturer_description}
										<p class="entity-description">
											{manufacturer.manufacturer_description.length > 100 ? 
												`${manufacturer.manufacturer_description.substring(0, 100)}...` : 
												manufacturer.manufacturer_description}
										</p>
									{:else}
										<p class="entity-no-description">No description provided</p>
									{/if}
									
									{#if manufacturer.website_url}
										<p class="entity-meta website-link">
											<span class="meta-label">Website:</span> 
											<a href={manufacturer.website_url} target="_blank" rel="noopener noreferrer" class="website-url">
												{new URL(manufacturer.website_url).hostname}
											</a>
										</p>
									{/if}
									
									<p class="entity-meta">
										<span class="meta-label">Created:</span> 
										<span class="date-value">
											{new Date(manufacturer.created_at).toLocaleDateString()}
										</span>
									</p>
								</div>
								
								<div class="entity-actions">
									<a href={`/manufacturer/${manufacturer.manufacturer_id}/edit`} class="icon-btn edit-btn" title="Edit Manufacturer">✏️</a>
									<a href="/manufacturer" class="icon-btn view-btn" title="View All Manufacturers">👁️</a>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="no-items">You haven't created any manufacturers yet.</p>
				{/if}

				<div class="action-buttons">
					<button 
						type="button" 
						class="enhanced-btn add-btn" 
						on:click={() => showManufacturerForm = !showManufacturerForm}
					>
						<svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							{#if showManufacturerForm}
								<line x1="18" y1="6" x2="6" y2="18"></line>
								<line x1="6" y1="6" x2="18" y2="18"></line>
							{:else}
								<line x1="12" y1="5" x2="12" y2="19"></line>
								<line x1="5" y1="12" x2="19" y2="12"></line>
							{/if}
						</svg>
						<span>{showManufacturerForm ? 'Cancel' : 'Add New Manufacturer'}</span>
					</button>
					<a href="/manufacturer" class="secondary-btn">View All Manufacturers</a>
				</div>

				{#if showManufacturerForm}
					<div class="form-container enhanced-form">
						<h2 class="form-title">Create New Manufacturer</h2>
						
						{#if $manufacturerMessage}
							<div class="form-message {$manufacturerMessage.includes('Failed') ? 'error' : 'success'}">
								{$manufacturerMessage}
							</div>
						{/if}
						
						<form method="POST" action="?/manufacturer" use:manufacturerEnhance class="form-grid">
							<div class="form-group">
								<label for="mfr-name" class="form-label">Name <span class="required">*</span></label>
								<input 
									id="mfr-name" 
									name="manufacturer_name" 
									bind:value={$manufacturerForm.manufacturer_name} 
									class="form-input enhanced-input"
									placeholder="Enter manufacturer name"
									required 
								/>
								{#if $manufacturerErrors.manufacturer_name}
									<span class="field-error">{$manufacturerErrors.manufacturer_name}</span>
								{/if}
							</div>
							
							<div class="form-group">
								<label for="mfr-description" class="form-label">Description</label>
								<textarea 
									id="mfr-description" 
									name="manufacturer_description" 
									bind:value={$manufacturerForm.manufacturer_description}
									class="form-textarea enhanced-textarea"
									placeholder="Enter manufacturer description"
									rows="3"
								></textarea>
								{#if $manufacturerErrors.manufacturer_description}
									<span class="field-error">{$manufacturerErrors.manufacturer_description}</span>
								{/if}
							</div>
							
							<div class="form-group">
								<label for="mfr-website" class="form-label">Website URL</label>
								<div class="input-with-icon">
									<svg xmlns="http://www.w3.org/2000/svg" class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<circle cx="12" cy="12" r="10"></circle>
										<line x1="2" y1="12" x2="22" y2="12"></line>
										<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
									</svg>
									<input 
										id="mfr-website" 
										name="website_url" 
										type="url" 
										class="form-input enhanced-input with-icon"
										bind:value={$manufacturerForm.website_url} 
										placeholder="https://example.com"
									/>
								</div>
								{#if $manufacturerErrors.website_url}
									<span class="field-error">{$manufacturerErrors.website_url}</span>
								{/if}
							</div>
							
							<div class="form-group">
								<label for="mfr-logo" class="form-label">Logo URL</label>
								<div class="input-with-icon">
									<svg xmlns="http://www.w3.org/2000/svg" class="input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
										<circle cx="8.5" cy="8.5" r="1.5"></circle>
										<polyline points="21 15 16 10 5 21"></polyline>
									</svg>
									<input 
										id="mfr-logo" 
										name="logo_url" 
										type="url" 
										class="form-input enhanced-input with-icon"
										bind:value={$manufacturerForm.logo_url}
										placeholder="https://example.com/logo.png"
									/>
								</div>
								{#if $manufacturerErrors.logo_url}
									<span class="field-error">{$manufacturerErrors.logo_url}</span>
								{/if}
							</div>
							
							<div class="form-actions">
								<button type="submit" class="enhanced-btn submit-btn" disabled={$manufacturerSubmitting}>
									<svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<path d="M20 6L9 17l-5-5"></path>
									</svg>
									<span>{$manufacturerSubmitting ? 'Creating...' : 'Create Manufacturer'}</span>
								</button>
								<button type="button" class="enhanced-btn cancel-btn" on:click={() => showManufacturerForm = false}>
									<svg xmlns="http://www.w3.org/2000/svg" class="btn-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<line x1="18" y1="6" x2="6" y2="18"></line>
										<line x1="6" y1="6" x2="18" y2="18"></line>
									</svg>
									<span>Cancel</span>
								</button>
							</div>
						</form>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Suppliers Tab -->
		{#if activeTab === 'suppliers'}
			<div class="tab-content">
				<h2>Your Suppliers</h2>
				{#if userSuppliers.length > 0}
					<div class="user-items-grid">
						{#each userSuppliers as supplier (supplier.supplier_id)}
							<div class="entity-card">
								<div class="card-header">
									{#if supplier.logo_url}
										<div class="logo-container">
											<img src={supplier.logo_url} alt={`${supplier.supplier_name} logo`} class="entity-logo" />
										</div>
									{:else}
										<div class="logo-placeholder">
											<span>{supplier.supplier_name.substring(0, 2).toUpperCase()}</span>
										</div>
									{/if}
									<h3 class="entity-name">{supplier.supplier_name}</h3>
								</div>
								
								<div class="card-content">
									{#if supplier.supplier_description}
										<p class="entity-description">
											{supplier.supplier_description.length > 60 ? 
												`${supplier.supplier_description.substring(0, 60)}...` : 
												supplier.supplier_description}
										</p>
									{:else}
										<p class="entity-no-description">No description provided</p>
									{/if}
									
									{#if supplier.website_url}
										<p class="entity-meta website-link">
											<span class="meta-label">Website:</span> 
											<a href={supplier.website_url} target="_blank" rel="noopener noreferrer" class="website-url">
												{new URL(supplier.website_url).hostname}
											</a>
										</p>
									{/if}
									
									{#if supplier.contact_info}
										{@const contact = processContactInfo(supplier.contact_info)}
										<div class="entity-meta contact-info">
											<span class="meta-label">Contact:</span>
											{#if contact.email}
												<a href="mailto:{contact.email}" class="contact-value">{contact.email}</a>
											{:else if contact.phone}
												<a href="tel:{contact.phone}" class="contact-value">{contact.phone}</a>
											{:else if contact.text}
												<span class="contact-value">{contact.text.length > 30 ? contact.text.substring(0, 30) + '...' : contact.text}</span>
											{:else}
												<span class="contact-value">Available</span>
											{/if}
										</div>
									{/if}
									
									<p class="entity-meta">
										<span class="meta-label">Created:</span> 
										<span class="date-value">
											{new Date(supplier.created_at).toLocaleDateString()}
										</span>
									</p>
								</div>
								
								<div class="entity-actions">
									<a href={`/supplier/${supplier.supplier_id}/edit`} class="icon-btn edit-btn" title="Edit Supplier">✏️</a>
									<a href="/supplier" class="icon-btn view-btn" title="View All Suppliers">👁️</a>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="no-items">You haven't created any suppliers yet.</p>
				{/if}

				<div class="action-buttons">
					<button type="button" class="primary-btn" on:click={() => showSupplierForm = !showSupplierForm}>
						{showSupplierForm ? 'Cancel' : 'Add New Supplier'}
					</button>
					<a href="/supplier" class="secondary-btn">View All Suppliers</a>
				</div>
				
				{#if showSupplierForm}
					<div class="form-container">
						<h2>Create New Supplier</h2>
						
						{#if $supplierMessage}
							<div class="form-message {$supplierMessage.includes('Failed') ? 'error' : 'success'}">
								{$supplierMessage}
							</div>
						{/if}
						
						<form method="POST" action="?/supplier" use:supplierEnhance class="form-grid">
							<div class="form-group">
								<label for="sup-name">Name <span class="required">*</span></label>
								<input 
									id="sup-name" 
									name="supplier_name" 
									bind:value={$supplierForm.supplier_name} 
									class="form-input"
									placeholder="Enter supplier name"
									required 
								/>
								{#if $supplierErrors.supplier_name}
									<span class="field-error">{$supplierErrors.supplier_name}</span>
								{/if}
							</div>
							
							<div class="form-group">
								<label for="sup-description">Description</label>
								<textarea 
									id="sup-description" 
									name="supplier_description" 
									bind:value={$supplierForm.supplier_description} 
									class="form-textarea"
									placeholder="Enter supplier description"
									rows="3"
								></textarea>
								{#if $supplierErrors.supplier_description}
									<span class="field-error">{$supplierErrors.supplier_description}</span>
								{/if}
							</div>
							
							<div class="form-group">
								<label for="sup-website">Website URL</label>
								<input 
									id="sup-website" 
									name="website_url" 
									type="url"
									bind:value={$supplierForm.website_url} 
									class="form-input"
									placeholder="https://example.com"
								/>
								{#if $supplierErrors.website_url}
									<span class="field-error">{$supplierErrors.website_url}</span>
								{/if}
							</div>
							
							<div class="form-group">
								<label for="sup-contact">Contact Information</label>
								<input
									id="sup-contact" 
									name="contact_info" 
									bind:value={$supplierForm.contact_info} 
									class="form-input"
									placeholder="Enter contact info (e.g., email or phone)"
								/>
								{#if $supplierErrors.contact_info}
									<span class="field-error">{$supplierErrors.contact_info}</span>
								{/if}
							</div>
							
							<div class="form-group">
								<label for="sup-logo">Logo URL</label>
								<input 
									id="sup-logo" 
									name="logo_url" 
									type="url"
									bind:value={$supplierForm.logo_url} 
									class="form-input"
									placeholder="https://example.com/logo.png"
								/>
								{#if $supplierErrors.logo_url}
									<span class="field-error">{$supplierErrors.logo_url}</span>
								{/if}
							</div>
							
							<div class="form-actions">
								<button type="submit" class="primary-btn" disabled={$supplierSubmitting}>
									{$supplierSubmitting ? 'Creating...' : 'Create Supplier'}
								</button>
								<button type="button" class="secondary-btn" on:click={() => showSupplierForm = false}>Cancel</button>
							</div>
						</form>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Categories Tab -->
		{#if activeTab === 'categories'}
			<div class="tab-content">
				<h2>Your Categories</h2>
				
				<!-- No duplicate form here -->

				<!-- User's categories list -->
				{#if userCategories.length > 0}
					<div class="user-items-grid">
						{#each userCategories as category}
							<Category {category} currentUserId={user.user_id} allCategories={allCategories} />
						{/each}
					</div>
				{:else}
					<p class="no-items">You haven't created any categories yet.</p>
				{/if}
				
				<div class="action-buttons">
					<button type="button" class="primary-btn" on:click={toggleCategoryForm}>
						{showCategoryForm ? 'Hide Form' : 'Add New Category'}
					</button>
					<a href="/category" class="secondary-btn">View All Categories</a>
				</div>
				
				{#if showCategoryForm}
					<div class="form-container">
						<h2>{editCategoryMode ? 'Edit' : 'Create New'} Category</h2>
						
						{#if $categoryMessage}
							<div class="form-message {$categoryMessage.includes('Failed') ? 'error' : 'success'}">
								{$categoryMessage}
							</div>
						{/if}
						
						<div class="embedded-form">
							<form method="POST" action="?/category" use:categoryEnhance enctype="application/x-www-form-urlencoded">
								{#if editCategoryMode}
									<input type="hidden" name="categoryId" value={currentCategoryId} />
								{/if}
								<div class="form-group">
									<label for="category_name">Name*</label>
									<input id="category_name" name="category_name" bind:value={$categoryForm.category_name} required />
									{#if $categoryErrors.category_name}<span class="error">{$categoryErrors.category_name}</span>{/if}
								</div>
								
								<div class="form-group">
									<label for="parent_id">Parent Category</label>
									<CategoryComboBox 
										categories={categories} 
										bind:value={$categoryForm.parent_id} 
										name="parent_id" 
										placeholder="Select parent category..." 
									/>
									{#if $categoryErrors.parent_id}<span class="error">{$categoryErrors.parent_id}</span>{/if}
								</div>
								
								<div class="form-group">
									<label for="category_description">Description</label>
									<textarea id="category_description" name="category_description" bind:value={$categoryForm.category_description}></textarea>
									{#if $categoryErrors.category_description}<span class="error">{$categoryErrors.category_description}</span>{/if}
								</div>
								
								<div class="form-group checkbox-group">
									<label>
										<input type="checkbox" name="is_public" bind:checked={$categoryForm.is_public} /> 
										Public
									</label>
									{#if $categoryErrors.is_public}<span class="error">{$categoryErrors.is_public}</span>{/if}
								</div>
								
								<div class="form-button-group">
									<button type="submit" class="primary-btn" disabled={$categorySubmitting}>
										{$categorySubmitting ? (editCategoryMode ? 'Saving...' : 'Creating...') : (editCategoryMode ? 'Save Changes' : 'Create Category')}
									</button>
									<button type="button" class="secondary-btn" on:click={cancelCategoryEdit}>Cancel</button>
								</div>
							</form>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</section>
</div>

<style>
	.dashboard-container {
		max-width: 1000px;
		margin: 2rem auto;
		padding: 0;
		color: hsl(var(--foreground));
		transition: color 0.3s, background-color 0.3s, border-color 0.3s;
	}

	.dashboard-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 2rem;
		background: linear-gradient(135deg, hsl(var(--primary-dark)), hsl(var(--primary)));
		border-radius: 8px 8px 0 0;
		color: hsl(var(--primary-foreground));
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.avatar {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 50px;
		height: 50px;
		background: hsl(var(--muted));
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: bold;
		color: hsl(var(--muted-foreground));
	}

	.entity-card .logo-container {
		width: 50px;
		height: 50px;
		border-radius: 8px;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		border: 1px solid hsl(var(--border));
		background-color: hsl(var(--surface-100));
	}

	.user-details {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.welcome {
		margin: 0;
		font-size: 1.5rem;
	}

	.logout-button {
		background: hsl(var(--background));
		color: hsl(var(--primary-dark));
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		transition: background-color 0.3s, color 0.3s;
	}

	.logout-button:hover {
		background: hsl(var(--muted));
	}

	/* Dashboard Tabs Styling */
	.dashboard-tabs {
		display: flex;
		justify-content: space-between;
		background: hsl(var(--surface-100));
		border-bottom: 1px solid hsl(var(--border));
	}

	.tab-button {
		flex: 1;
		padding: 1rem 0.5rem;
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		cursor: pointer;
		font-weight: 600;
		transition: all 0.2s ease;
		color: hsl(var(--muted-foreground));
	}

	.tab-button:hover {
		background: hsl(var(--muted));
		color: hsl(var(--primary));
	}

	.tab-button.active {
		border-bottom: 2px solid hsl(var(--primary));
		color: hsl(var(--primary));
	}

	/* Dashboard Content Styling */
	.dashboard-content {
		background: hsl(var(--background));
		padding: 2rem;
		border-radius: 0 0 8px 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		transition: background-color 0.3s, color 0.3s;
	}

	.tab-content {
		animation: fadeIn 0.3s ease;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.tab-content h2 {
		margin-top: 0;
		color: hsl(var(--foreground));
		margin-bottom: 1.5rem;
	}

	.projects-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin: 1rem 0 2rem 0;
	}

	.user-items-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin: 1rem 0 2rem 0;
	}

	.project-card {
		background: hsl(var(--surface-100));
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		transition: box-shadow 0.3s, border-color 0.3s, background-color 0.3s;
		border: 1px solid hsl(var(--border));
	}

	.project-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		border-color: hsl(var(--primary));
	}

	.project-link {
		color: hsl(var(--primary));
		font-weight: bold;
		text-decoration: none;
	}

	.project-link:hover {
		text-decoration: underline;
	}

	.no-items {
		color: hsl(var(--muted-foreground));
		font-style: italic;
		padding: 1rem;
		background: hsl(var(--surface-100));
		border-radius: 8px;
		text-align: center;
		margin-bottom: 2rem;
	}

	.form-container {
		margin-top: 2rem;
		padding: 2rem;
		background: hsl(var(--surface-100));
		border-radius: 12px;
		border: 1px solid hsl(var(--border));
		box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
		transition: background-color 0.3s, border-color 0.3s;
	}

	.form-container h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: hsl(var(--foreground));
		border-bottom: 1px solid hsl(var(--border));
		padding-bottom: 0.5rem;
	}

	.embedded-form {
		margin-top: 1rem;
	}

	.form-message {
		padding: 0.75rem 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		transition: background-color 0.3s, color 0.3s, border-color 0.3s;
		background-color: hsl(var(--surface-100));
		border: 1px solid hsl(var(--border));
		color: hsl(var(--foreground));
	}

	.form-message.success {
		background: hsl(var(--success) / 0.2);
		border: 1px solid hsl(var(--success));
		color: hsl(var(--success));
	}

	.form-message.error {
		background: hsl(var(--destructive) / 0.2);
		border: 1px solid hsl(var(--destructive));
		color: hsl(var(--destructive));
	}

	.entity-card {
		background: hsl(var(--card));
		border-radius: 8px;
		padding: 1.25rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		display: flex;
		gap: 1rem;
		transition: box-shadow 0.3s, transform 0.2s, background-color 0.3s, border-color 0.3s;
		border: 1px solid hsl(var(--border));
		position: relative;
	}

	.entity-card:hover {
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
		border-color: hsl(var(--card-hover-border));
	}

	.entity-card h3 {
		margin-top: 0;
		margin-bottom: 0.5rem;
		font-size: 1.1rem;
		color: hsl(var(--card-foreground));
	}

	.entity-meta {
		margin-bottom: 0.5rem;
		color: hsl(var(--muted-foreground));
		font-size: 0.875rem;
	}

	.entity-description {
		font-size: 0.95rem;
		line-height: 1.5;
		color: hsl(var(--foreground));
		margin-bottom: 1rem;
	}

	.entity-no-description {
		font-size: 0.95rem;
		color: hsl(var(--muted-foreground));
		font-style: italic;
		margin-bottom: 1rem;
	}

	.website-link {
		display: flex;
		align-items: center;
	}

	.website-url {
		color: hsl(var(--primary));
		text-decoration: none;
		font-size: 0.825rem;
		word-break: break-all;
	}

	.website-url:hover {
		text-decoration: underline;
	}

	.contact-value {
		color: hsl(var(--foreground));
		font-size: 0.825rem;
		word-break: break-all;
	}

	.contact-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.date-value {
		color: hsl(var(--muted-foreground));
	}

	.entity-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
		justify-content: flex-end;
	}

	.icon-btn {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 1rem;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.view-btn:hover {
		background: hsl(var(--muted));
	}

	.edit-btn:hover {
		background: hsl(var(--primary) / 0.1);
	}

	.project-form {
		display: flex;
		gap: 1rem;
		margin-top: 1rem;
	}

	.project-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid hsl(var(--input-border));
		border-radius: 6px;
		font-size: 1rem;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.form-grid {
		display: grid;
		gap: 1.5rem;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-input, .form-textarea {
		padding: 0.75rem;
		border: 1px solid hsl(var(--input-border));
		border-radius: 6px;
		font-size: 1rem;
		transition: all 0.2s ease;
		width: 100%;
	}

	.form-input:focus, .form-textarea:focus {
		outline: none;
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
	}

	.enhanced-input {
		border: 1px solid hsl(var(--input-border));
		border-radius: 6px;
		padding: 0.75rem;
		font-size: 1rem;
		background-color: hsl(var(--input));
		color: hsl(var(--input-foreground));
		transition: border-color 0.15s, background-color 0.3s, color 0.3s;
	}

	.enhanced-input:focus {
		outline: none;
		border-color: hsl(var(--ring));
		box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
	}

	.enhanced-input::placeholder {
		color: hsl(var(--muted-foreground));
	}

	.input-with-icon {
		position: relative;
	}

	.input-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: hsl(var(--muted-foreground));
	}

	.enhanced-form {
		background-color: hsl(var(--surface-100));
		border: 1px solid hsl(var(--border));
		border-radius: 6px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
	}

	.form-title {
		color: hsl(var(--foreground));
		font-size: 1.25rem;
		font-weight: 600;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid hsl(var(--border));
		margin-bottom: 1.5rem;
	}

	.form-textarea {
		resize: vertical;
		min-height: 100px;
	}

	.form-actions {
		margin-top: 1.5rem;
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.field-error {
		color: hsl(var(--destructive));
		font-size: 0.875rem;
		padding: 0.25rem 0.5rem;
		background: hsl(var(--destructive) / 0.2);
		border-radius: 4px;
		border: 1px solid hsl(var(--destructive));
	}

	.required {
		color: hsl(var(--destructive));
	}

	.primary-btn {
		background: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.3s;
	}

	.primary-btn:hover {
		background: hsl(var(--primary-dark));
	}

	.enhanced-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem 1.25rem;
		font-size: 0.875rem;
		font-weight: 600;
		border-radius: 6px;
		transition: all 0.15s ease;
		gap: 0.5rem;
		cursor: pointer;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid transparent;
	}

	.add-btn {
		background-color: hsl(var(--primary));
		color: hsl(var(--primary-foreground));
		border-color: hsl(var(--primary-dark));
	}

	.add-btn:hover {
		background-color: hsl(var(--primary-dark));
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
		transform: translateY(-1px);
	}

	.submit-btn {
		background-color: hsl(var(--success));
		color: hsl(var(--success-foreground));
		border-color: hsl(var(--success-dark));
	}

	.submit-btn:hover {
		background-color: hsl(var(--success-dark));
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.cancel-btn {
		background-color: hsl(var(--background));
		color: hsl(var(--foreground));
		border-color: hsl(var(--border));
	}

	.cancel-btn:hover {
		background-color: hsl(var(--muted));
		border-color: hsl(var(--muted-foreground));
	}

	.btn-icon {
		flex-shrink: 0;
	}

	.secondary-btn {
		background: hsl(var(--background));
		color: hsl(var(--primary));
		border: 1px solid hsl(var(--primary));
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s ease;
		font-weight: 600;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}

	.secondary-btn:hover {
		background: hsl(var(--primary) / 0.1);
		transform: translateY(-1px);
	}

	@media (max-width: 768px) {
		.dashboard-tabs {
			flex-wrap: wrap;
		}

		.tab-button {
			flex: 1 0 33.333%;
			padding: 0.75rem 0.5rem;
		}

		.action-buttons {
			flex-direction: column;
		}
	}

	@media (max-width: 600px) {
		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
		}

		.tab-button {
			flex: 1 0 50%;
			font-size: 0.9rem;
		}

		.dashboard-content {
			padding: 1.25rem;
		}

		.projects-grid,
		.user-items-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
