import { deLocalizeUrl } from '$lib/paraglide/runtime.js';
import type { RequestEvent } from '@sveltejs/kit';

export const reroute = (request: RequestEvent) => deLocalizeUrl(request.url).pathname;
