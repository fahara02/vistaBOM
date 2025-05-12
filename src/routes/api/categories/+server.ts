import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sql from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
  const { user } = locals;
  
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Get all categories with optimization for UI performance
    const categories = await sql`
      SELECT id, name, path, parent_id as "parentId", is_public as "isPublic", created_by as "createdBy"
      FROM category
      WHERE is_deleted = false
      ORDER BY name ASC
      LIMIT 1000 -- Practical limit for UI performance
    `;
    
    return json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    return json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
};
