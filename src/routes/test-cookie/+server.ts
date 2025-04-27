// src/routes/test-cookie/+server.ts
import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = ({ cookies }) => {
	cookies.set('test-cookie', 'test-value', {
		path: '/',
		httpOnly: false,
		sameSite: 'lax',
		secure: false,
		maxAge: 60 * 60 * 24
	});
	return new Response('Cookie set!');
};
