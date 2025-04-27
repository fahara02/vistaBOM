//src/routes/auth/google/+server.ts
import { GOOGLE_CLIENT_ID } from '$lib/env';
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export function GET({ url }: RequestEvent) {
	console.log('Reached /auth/google');
	// Build OAuth URL with properly encoded parameters
	const redirectUri = url.origin + '/auth/google/callback';
	const params = new URLSearchParams({
		client_id: GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'email profile'
	});
	const authorizationUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
	console.log('Redirecting to:', authorizationUrl);
	throw redirect(302, authorizationUrl);
}
