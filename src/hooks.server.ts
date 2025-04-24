// import type { Handle } from '@sveltejs/kit';
// import { paraglideMiddleware } from '$lib/paraglide/server';

// const handleParaglide: Handle = ({ event, resolve }) =>
// 	paraglideMiddleware(event.request, ({ request, locale }) => {
// 		event.request = request;

// 		return resolve(event, {
// 			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
// 		});
// 	});

// export const handle: Handle = handleParaglide;
import { prisma } from '$lib/server/db/prisma';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('auth-session');
  if (token) {
    const session = await prisma.session.findUnique({
      where: { id: token },
      include: { user: true }
    });
    if (session && session.expiresAt > new Date()) {
      event.locals.user = session.user;
    } else {
      event.cookies.delete('auth-session', { path: '/' });
    }
  }
  return resolve(event);
};