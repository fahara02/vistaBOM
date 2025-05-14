// src/routes/api/parts/[id]/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { getPartWithCurrentVersion } from '@/core/parts';
import type { Part, PartVersion } from '@/types/types';

export async function GET({ params, locals }: RequestEvent): Promise<Response> {
    try {
        const user = locals.user;
        if (!user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { id } = params;
        if (!id) {
            return new Response(JSON.stringify({ error: 'Part ID is required' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { part, currentVersion } = await getPartWithCurrentVersion(id);

        // Verify that the user has permission to access this part
        if (part.creatorId !== user.id && !part.isPublic) {
            return new Response(JSON.stringify({ error: 'You do not have permission to access this part' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return json({
            part,
            currentVersion
        });
    } catch (error) {
        console.error('Error fetching part:', error);
        return new Response(JSON.stringify({ 
            error: 'Failed to fetch part data',
            message: error instanceof Error ? error.message : 'Unknown error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
