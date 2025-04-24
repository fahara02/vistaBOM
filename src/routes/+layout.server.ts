// src/routes/+layout.server.ts
import { prisma } from '$lib/server/db/prisma';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
    const token = cookies.get('auth-session');
    if (!token) return { user: null };

    const session = await prisma.session.findUnique({
        where: { id: token },
        include: { user: true }
    });

    return {
        user: session?.user ?? null
    };
};