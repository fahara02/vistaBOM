
//src/routes/category/[id]/+server.ts
import type { RequestHandler } from '@sveltejs/kit';

import { deleteCategory, updateCategory } from '$lib/core/category';

export const PUT: RequestHandler = async ({ params, request }) => {
  const id = params.id;
  
  // Validate that ID exists and is a string
  if (!id) {
    return new Response(JSON.stringify({ message: 'Missing category ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { name, userId } = await request.json();
  try {
    // Using the new porsager/postgres API - no client parameter needed
    const updated = await updateCategory(id, { name }, userId);
    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ message: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: RequestHandler = async ({ params, request, locals }) => {
  const id = params.id;
  
  // Validate that ID exists and is a string
  if (!id) {
    return new Response(JSON.stringify({ message: 'Missing category ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Try to get userId from request body, but fallback to locals if not available
  let userId;
  try {
    const body = await request.json();
    userId = body.userId;
  } catch (error) {
    // If there's no body or JSON is invalid, check if we have user in locals
    console.log('No valid JSON body in DELETE request, checking locals');
    if (locals.user?.user_id) {
      userId = locals.user.user_id;
    } else {
      return new Response(JSON.stringify({ message: 'User ID is required for deletion' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  if (!userId) {
    return new Response(JSON.stringify({ message: 'User ID is required for deletion' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Using the new porsager/postgres API - no client parameter needed
    await deleteCategory(id, userId);
    return new Response(null, { status: 204 });
  } catch (err) {
    console.error('Error deleting category:', err);
    return new Response(JSON.stringify({ message: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
