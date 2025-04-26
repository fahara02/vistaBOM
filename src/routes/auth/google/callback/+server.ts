//src/routes/auth/google/callback/+server.ts

import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$lib/env';
import { createSession, generateSessionToken } from '$lib/server/auth';
import client from '$lib/server/db/index';
import type { User } from '$lib/server/db/types';
import { randomUUID } from 'crypto';
import { error, redirect } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET({ url, cookies }: RequestEvent) {
  const code = url.searchParams.get('code');
  if (!code) throw error(400, 'Missing code');

  // Exchange authorization code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/auth/google/callback`,
      grant_type: 'authorization_code'
    })
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok) throw error(500, 'Token exchange failed');

  // Fetch user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const userInfo = await userRes.json();
  if (!userRes.ok) throw error(500, 'Failed to fetch user info');

  // Map DB row to User
  function rowToUser(raw: any): User {
    // ts-postgres returns rows as arrays; destructure accordingly
    const [id, age, username, email, fullName, passwordHash, googleId, avatarUrl] = raw;
    return { id, age, username, email, fullName, passwordHash, googleId, avatarUrl };
  }

  let user: User;
  const find = await client.query(
    `SELECT id, age, username, email, full_name AS "fullName", password_hash AS "passwordHash", google_id AS "googleId", avatar_url AS "avatarUrl"
     FROM "User" WHERE google_id = $1 OR email = $2`,
    [userInfo.id, userInfo.email]
  );

  if (find.rows.length > 0) {
    user = rowToUser(find.rows[0]);
    // Update avatar or set googleId if missing
    if (!user.googleId || user.avatarUrl !== userInfo.picture) {
      const upd = await client.query(
        `UPDATE "User" SET google_id = $1, avatar_url = $2 WHERE id = $3
         RETURNING id, age, username, email, full_name AS "fullName", password_hash AS "passwordHash", google_id AS "googleId", avatar_url AS "avatarUrl"`,
        [userInfo.id, userInfo.picture, user.id]
      );
      user = rowToUser(upd.rows[0]);
    }
  } else {
    const newId = randomUUID();
    const ins = await client.query(
      `INSERT INTO "User"(id, email, full_name, google_id, avatar_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, age, username, email, full_name AS "fullName", password_hash AS "passwordHash", google_id AS "googleId", avatar_url AS "avatarUrl"`,
      [newId, userInfo.email, userInfo.name, userInfo.id, userInfo.picture]
    );
    user = rowToUser(ins.rows[0]);
  }

  if (!user) throw error(500, 'User creation failed');

  // Create session
  const sessionToken = generateSessionToken();
  await createSession(sessionToken, user.id);

  // Set session cookie
  const isDev = import.meta.env.DEV;
  cookies.set('auth-session', sessionToken, {
    path: '/', httpOnly: true, secure: !isDev,
    sameSite: isDev ? 'lax' : 'none', maxAge: 60 * 60 * 24 * 30
  });

  // Redirect to dashboard
  throw redirect(303, '/dashboard');
}