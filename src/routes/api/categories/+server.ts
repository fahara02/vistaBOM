//src/routes/api/categories/+server.ts

import sql from '$lib/server/db';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * GET handler for categories API
 * Returns only non-deleted categories with parent info
 */
export const GET: RequestHandler = async ({ locals }) => {
  const { user } = locals;
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Simple direct approach - only get non-deleted categories
    console.log('Fetching all non-deleted categories...');
    
    const categories = await sql`
      SELECT 
        c.category_id, 
        c.category_name, 
        c.category_path, 
        c.category_description,
        c.parent_id, 
        c.is_public, 
        c.created_by,
        c.created_at,
        c.updated_at,
        c.is_deleted,
        c.deleted_at,
        c.deleted_by,
        p.category_name AS parent_name
      FROM 
        "Category" c
      LEFT JOIN
        "Category" p ON c.parent_id = p.category_id
      WHERE 
        c.is_deleted = false
      ORDER BY 
        c.category_path ASC
    `;
    
    console.log(`Database returned ${categories.length} non-deleted categories`);
    
    // Return only non-deleted categories
    return json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
};
