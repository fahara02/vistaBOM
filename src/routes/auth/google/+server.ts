import { GOOGLE_CLIENT_ID } from '$lib/env';
import { redirect } from '@sveltejs/kit';

export function GET() {
  console.log('Reached /auth/google');
  // Build OAuth URL with properly encoded parameters
  const redirectUri = 'http://localhost:5173/auth/google/callback';
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