// src/lib/actions/dashboard/project.ts
import sql from '$lib/server/db/index';
import { fail } from '@sveltejs/kit';
import { zod } from 'sveltekit-superforms/adapters';
import { message, superValidate } from 'sveltekit-superforms/server';
import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '$lib/types/schemaTypes';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// Project schema matching the database structure
const projectSchema = z.object({
    project_name: z.string().min(1, 'Project name is required').max(100),
    project_description: z.string().max(1000).optional().nullable(),
    project_status: z.string().default('active')
});

/**
 * Handles project creation and update
 */
export async function projectAction(event: RequestEvent) {
    const user = event.locals.user as User | null;
    if (!user) {
        return fail(401, { message: 'You must be logged in to create a project' });
    }
    
    // Validate form data
    const form = await superValidate(event, zod(projectSchema));
    
    if (!form.valid) {
        return message(form, 'Invalid form data. Please check your inputs.', { status: 400 });
    }
    
    try {
        // Create project with validated data
        const projectId = randomUUID();
        await sql`
            INSERT INTO "Project" (
                project_id,
                project_name,
                project_description,
                project_status,
                owner_id,
                created_at,
                updated_at,
                updated_by
            ) VALUES (
                ${projectId},
                ${form.data.project_name},
                ${form.data.project_description || null},
                ${form.data.project_status},
                ${user.user_id},
                NOW(),
                NOW(),
                ${user.user_id}
            )
        `;
        
        return message(form, 'Project created successfully', {
            status: 201,
            data: { projectId }
        });
    } catch (error) {
        console.error('Error creating project:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return message(form, `Failed to create project: ${errorMessage}`, { status: 500 });
    }
}
