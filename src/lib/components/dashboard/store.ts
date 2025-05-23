// src/routes/dashboard/store.ts
import { writable, derived } from 'svelte/store';
import type { Category, Manufacturer, Part, Project, Supplier } from '$lib/types/schemaTypes';
import { goto, invalidate } from '$app/navigation';

// Define types for tabs
export type TabType = 'projects' | 'parts' | 'manufacturers' | 'suppliers' | 'categories';

// Store for active tab with localStorage persistence
function createTabStore() {
    // Default to 'projects' tab
    const defaultTab = 'projects' as TabType;
    
    // Initialize from localStorage if available
    let initialTab = defaultTab;
    if (typeof window !== 'undefined') {
        const storedTab = localStorage.getItem('vistaBOM_activeTab');
        if (storedTab && ['projects', 'parts', 'manufacturers', 'suppliers', 'categories'].includes(storedTab)) {
            initialTab = storedTab as TabType;
        }
    }
    
    const { subscribe, set } = writable<TabType>(initialTab);
    
    return {
        subscribe,
        setTab: (tab: TabType) => {
            // Save to localStorage and update the store
            if (typeof window !== 'undefined') {
                localStorage.setItem('vistaBOM_activeTab', tab);
            }
            set(tab);
        }
    };
}

// Form visibility stores
export const showPartForm = writable<boolean>(false);
export const showCategoryForm = writable<boolean>(false);
export const showManufacturerForm = writable<boolean>(false);
export const showSupplierForm = writable<boolean>(false);
export const showProjectForm = writable<boolean>(false);

// Edit mode stores
export const editCategoryMode = writable<boolean>(false);
export const currentCategoryId = writable<string | null>(null);

// User data
export const categories = writable<Category[]>([]);
export const allCategories = writable<Category[]>([]);
export const userCategories = writable<Category[]>([]);
export const userParts = writable<Part[]>([]);
export const userManufacturers = writable<Manufacturer[]>([]);
export const userSuppliers = writable<Supplier[]>([]);
export const projects = writable<Project[]>([]);

// Create and export the active tab store
export const activeTab = createTabStore();

// Data refresh function with enhanced category refresh
export async function refreshData(): Promise<void> {
    try {
        console.log('Refreshing dashboard data...');
        
        // First invalidate all data dependencies to trigger page load function
        await invalidate('app:dashboard');
        
        // For critical data like categories, add direct invalidation
        await invalidate((url) => {
            return url.pathname.includes('/dashboard') || url.pathname.includes('/category');
        });
        
        console.log('Dashboard data refresh complete');
    } catch (error) {
        console.error('Error refreshing data:', error);
    }
}

// For backward compatibility
export async function refreshCategoryData(): Promise<void> {
    await refreshData();
}
