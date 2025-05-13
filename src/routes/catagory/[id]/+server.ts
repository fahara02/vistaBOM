
//src/routes/catagory/[id]/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import sql from '$lib/server/db/index';
import { updateCategory, deleteCategory } from '@/core/category';

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

export const DELETE: RequestHandler = async ({ params, request }) => {
  const id = params.id;
  
  // Validate that ID exists and is a string
  if (!id) {
    return new Response(JSON.stringify({ message: 'Missing category ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  const { userId } = await request.json();
  try {
    // Using the new porsager/postgres API - no client parameter needed
    await deleteCategory(id, userId);
    return new Response(null, { status: 204 });
  } catch (err) {
    return new Response(JSON.stringify({ message: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
