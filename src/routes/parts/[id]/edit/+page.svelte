<!-- src/routes/parts/[id]/edit/+page.svelte -->
<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import PartForm from '$lib/components/PartForm.svelte';
	import { prepareFormDataForValidation } from '$lib/utils/formUtils';
	import { LifecycleStatusEnum } from '$lib/types/types';
	import type { PageData } from './$types';

	export let data: PageData;

	// Access categories and manufacturers from data with type safety
	type Manufacturer = { id: string; name: string; [key: string]: any };
	type Category = { id: string; name: string; [key: string]: any };
	
	// Get manufacturers and categories with proper type safety
	// Type assertion is needed because currentVersion might not directly expose these properties in TypeScript
	const categoriesData = ((data.currentVersion as any)?.category_links || []) as any[];
	const manufacturersData = ((data.currentVersion as any)?.manufacturer_parts || []).map((mp: any) => {
		return {
			id: mp.manufacturer_id,
			name: mp.manufacturer_name || 'Unknown'
		};
	});
	
	// Convert to proper arrays with type assertions
	const categories = categoriesData as Category[];
	const manufacturers = manufacturersData as Manufacturer[];
	
	// Debug the data being passed to the form component
	console.log('Edit page loaded with part data:', {
		part: data.part,
		currentVersion: data.currentVersion,
		formData: data.form,
		categoriesCount: categories.length,
		manufacturersCount: manufacturers.length
	});

	// CRITICAL FIX: Ensure relationship data is properly logged with type assertions
	const currentVersionAny = data.currentVersion as any;
	if (currentVersionAny?.category_links) {
		console.log('Categories from currentVersion:', currentVersionAny.category_links);
	}
	
	if (currentVersionAny?.manufacturer_parts) {
		console.log('Manufacturer parts from currentVersion:', currentVersionAny.manufacturer_parts);
	}

	// Pre-process form data to ensure JSON fields are correctly formatted before validation
	if (data.form?.data) {
		// Fix JSON fields that should be strings (like full_description/long_description)
		console.log('Pre-processing form data for validation');
		
		// Create a properly typed clone of the data to avoid TypeScript errors
		// This preserves all the original properties while ensuring type safety
		const processedData = prepareFormDataForValidation(data.form.data);
		
		// Apply the processed data back to the form data while preserving the original type
		Object.assign(data.form.data, processedData);
		
		console.log('Processed form data:', data.form.data);
	}

	// Initialize SuperForm with server-provided data
	const { form, errors, enhance } = superForm(data.form, {
		dataType: 'json',
		onUpdated: ({ form }) => {
			console.log('Form updated in edit page:', form);
		},
		onSubmit: (event) => {
			// Get the form data from the event
			const formData = event.formData as Record<string, any>;
			
			// Ensure JSON fields are properly formatted before submission
			console.log('FORM BEFORE VALIDATION:', formData);
			
			// Apply validation fixes
			const validatedData = prepareFormDataForValidation(formData);
			
			// Explicitly handle enum fields with empty strings
			const enumFields = [
				'weight_unit', 
				'dimensions_unit', 
				'temperature_unit', 
				'tolerance_unit',
				'package_type',
				'package_case',
				'mounting_style',
				'termination_style'
			];
			
			enumFields.forEach(field => {
				if (field in validatedData && (validatedData[field] === '' || validatedData[field] === undefined)) {
					console.log(`Converting empty enum field ${field} to null in submit handler`);
					validatedData[field] = null;
				}
			});
			
			// Log validation details
			console.log('FORM VALIDATION FIXES APPLIED:', validatedData);
			console.log('full_description type:', typeof validatedData.full_description);
			
			// Ensure manufacturer parts and categories are included
			console.log('Category IDs and manufacturer parts check:',
				formData.category_ids || 'none',
				formData.manufacturer_parts || 'none'
			);
			
			// Replace the data with the validated version
			Object.assign(formData, validatedData);
		}
	});

	// Verify form data is correctly loaded with all fields
	console.log('SuperForm initialized with data:', $form);
	console.log('Form fields count:', Object.keys($form).length);
</script>

<div class="edit-part-container">
	<h1>Edit Part - {data.currentVersion?.part_name}</h1>
	<!-- Pass all relationship data explicitly to ensure it's available for display -->
	<PartForm 
		form={form} 
		enhance={enhance} 
		errors={errors} 
		partData={data.part as any} 
		versionData={{
			...data.currentVersion, 
			// Handle all JSON fields with proper typing
			dimensions: typeof data.currentVersion?.dimensions === 'string' 
				? JSON.parse(data.currentVersion.dimensions as string) 
				: data.currentVersion?.dimensions,
			properties: {},
			technical_specifications: {}, 
			electrical_properties: {},
			mechanical_properties: {},
			thermal_properties: {},
			material_composition: {},
			environmental_data: {}
		}} 
		isEditMode={true} 
		manufacturers={manufacturers.map((m: Manufacturer) => ({
			manufacturer_id: m.id,
			manufacturer_name: m.name,
			created_at: new Date(),
			updated_at: new Date()
		})) as any} 
		categories={categories as any}
		selectedCategoryIds={currentVersionAny?.category_links?.map((cat: any) => cat.category_id) || []}
		selectedManufacturerParts={currentVersionAny?.manufacturer_parts?.map((mp: any) => ({
			id: mp.id,
			manufacturer_id: mp.manufacturerId,
			manufacturer_part_number: mp.partNumber,
			manufacturer_name: manufacturers.find((m: any) => m.id === mp.manufacturerId)?.name || 'Unknown',
			is_recommended: true
		})) || []}
		serverFormData={data.form} 
	/>
</div>

<style>
	.edit-part-container {
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
		color: hsl(var(--foreground));
		transition: background-color 0.3s, color 0.3s, border-color 0.3s;
	}
	
	h1 {
		margin-bottom: 0.5rem;
		color: hsl(var(--foreground));
	}
</style>
