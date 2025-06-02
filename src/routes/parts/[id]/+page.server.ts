//src/routes/parts/[id]/+page.server.ts

import type { PageServerLoad, Actions } from './$types';
import { getPartWithCurrentVersion, deletePart } from '@/core/parts';
import { redirect, error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
  try {
    const { id } = params;
    
    // Even more thorough validation of the ID parameter
    if (!id || typeof id !== 'string' || id === 'undefined' || id === 'null' || id.trim() === '') {
      console.error(`[parts/[id]/+page.server.ts] Invalid part ID: '${id}'`);
      console.log('Redirecting to parts list due to invalid ID');
      throw redirect(303, '/parts');
    }
    
    // UUID validation - should be a valid UUID format
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(id)) {
      console.error(`[parts/[id]/+page.server.ts] ID is not a valid UUID format: '${id}'`);
      throw error(400, 'Invalid part ID format');
    }
    
    console.log(`[parts/[id]/+page.server.ts] Loading part details for ID: ${id}`);
    const { part, currentVersion } = await getPartWithCurrentVersion(id);
    return { part, currentVersion };
  } catch (err) {
    console.error(`[parts/[id]/+page.server.ts] Error loading part:`, err);
    if (err instanceof Error) {
      // If this is already a SvelteKit error, just rethrow it
      if ('status' in err) throw err;
      // Otherwise wrap as a server error
      throw error(err.message.includes('not found') ? 404 : 500, err.message);
    }
    // Generic error case
    throw error(500, 'Failed to load part details');
  }
};

export const actions: Actions = {
  delete: async ({ params }) => {
    try {
      // Validate ID parameter
      const id = params.id;
      if (!id || typeof id !== 'string' || id.trim() === '') {
        console.error(`[parts/[id]/+page.server.ts][delete] Invalid part ID: ${id}`);
        throw error(400, `Cannot delete: Invalid part ID`);
      }

      console.log(`[parts/[id]/+page.server.ts][delete] Deleting part with ID: ${id}`);
      
      try {
        // Wrap deletePart in its own try/catch to get more specific error information
        await deletePart(id);
        console.log(`[parts/[id]/+page.server.ts][delete] Successfully deleted part ID: ${id}`);
        // Successful deletion - redirect to parts list
        throw redirect(303, '/parts');
      } catch (deleteErr) {
        // Log the specific database error
        console.error(`[parts/[id]/+page.server.ts][delete] Database error:`, deleteErr);
        
        // Check for specific error conditions
        const errorMsg = deleteErr instanceof Error ? deleteErr.message : 'Unknown database error';
        
        // Look for specific patterns in the error message to provide better feedback
        if (errorMsg.includes('foreign key constraint')) {
          throw error(400, `Cannot delete part: It is referenced by other items in the system`);
        } else if (errorMsg.includes('not found')) {
          throw error(404, `Part with ID ${id} not found`);
        } else {
          // Generic database error
          throw error(500, `Database error: ${errorMsg}`);
        }
      }
    } catch (err) {
      console.error(`[parts/[id]/+page.server.ts][delete] Error deleting part:`, err);
      
      // If it's already a redirect or error, just rethrow it
      if (err instanceof Error && ('status' in err || 'location' in err)) {
        throw err;
      }
      
      // Otherwise wrap as a server error with more detail
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      throw error(500, `Failed to delete part: ${errorMessage}`);
    }
  }
};
