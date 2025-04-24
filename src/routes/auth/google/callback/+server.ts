import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$lib/env';
import { createSession, generateSessionToken } from '$lib/server/auth';
import { prisma } from '$lib/server/db/prisma';
import { redirect } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ url, cookies }: RequestEvent) {
  const code = url.searchParams.get('code');
  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: 'http://localhost:5173/auth/google/callback',
      grant_type: 'authorization_code'
    })
  });

  const tokenData = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.error(tokenData);
    return new Response('Failed to get token', { status: 500 });
  }

  const accessToken = tokenData.access_token;
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  const userInfo = await userInfoResponse.json();
  if (!userInfoResponse.ok) {
    console.error(userInfo);
    return new Response('Failed to get user info', { status: 500 });
  }

  const googleId = userInfo.id;
  const email = userInfo.email;
  const fullName = userInfo.name;
  const avatarUrl = userInfo.picture; // Added to get avatar URL

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] }
  });

  if (user) {
    if (!user.googleId || user.avatarUrl !== avatarUrl) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl }
      });
    }
  } else {
    user = await prisma.user.create({
      data: {
        id: randomUUID(),
        email,
        fullName,
        googleId,
        avatarUrl
      }
    });
  }

  const token = generateSessionToken();
  const session = await createSession(token, user.id);
  cookies.set('auth-session', session.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    expires: session.expiresAt
  });

  throw redirect(302, '/dashboard'); // Changed to redirect to dashboard
}