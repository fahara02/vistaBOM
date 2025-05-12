import type { RequestHandler } from '@sveltejs/kit';
import client from '$lib/server/db/index';
import { updateCategory, deleteCategory } from '$lib/server/category';

export const PUT: RequestHandler = async ({ params, request }) => {
  const { id } = params;
  const { name, userId } = await request.json();
  try {
    const updated = await updateCategory(client, id, { name }, userId);
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
  const { id } = params;
  const { userId } = await request.json();
  try {
    await deleteCategory(client, id, userId);
    return new Response(null, { status: 204 });
  } catch (err) {
    return new Response(JSON.stringify({ message: (err as Error).message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
