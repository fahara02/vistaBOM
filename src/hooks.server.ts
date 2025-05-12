//src/hooks.server.ts
import { validateSessionToken, sessionCookieName } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(sessionCookieName);
	if (token) {
		const { session, user } = await validateSessionToken(token);
		if (session && user) {
			event.locals.user = user;
		} else {
			event.cookies.delete(sessionCookieName, { path: '/' });
		}
	}
	if (
		event.url.pathname.startsWith(
			'/.well-known/appspecific/com.chrome.devtools'
		)
	) {
		return new Response(null, { status: 204 }); // Return empty response with 204 No Content
	}
	return resolve(event);
};
