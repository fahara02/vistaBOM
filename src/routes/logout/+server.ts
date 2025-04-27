import type { RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { invalidateSession } from '$lib/server/auth';

export async function GET({ cookies }: RequestEvent) {
	const sessionId = cookies.get('auth-session');
	if (sessionId) {
		await invalidateSession(sessionId);
		cookies.delete('auth-session', { path: '/' });
	}

	throw redirect(302, '/');
}
