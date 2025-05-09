import { deLocalizeUrl } from '$lib/paraglide/runtime';
import type { RequestEvent } from '@sveltejs/kit';

export const reroute = (request: RequestEvent) => deLocalizeUrl(request.url).pathname;
