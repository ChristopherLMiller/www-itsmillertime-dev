import { CLOCKIFY_API_KEY, CLOCKIFY_WORKSPACE_ID } from '$env/static/private';
import { error, json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	if (!CLOCKIFY_API_KEY || !CLOCKIFY_WORKSPACE_ID) {
		throw error(500, 'Clockify credentials not configured');
	}

	try {
		const response = await fetch(
			`https://api.clockify.me/api/v1/workspaces/${CLOCKIFY_WORKSPACE_ID}/projects/${params.id}`,
			{
				headers: {
					'X-Api-Key': CLOCKIFY_API_KEY
				}
			}
		);

		if (response.status === 404) {
			throw error(404, 'Project not found');
		}

		if (!response.ok) {
			throw error(500, 'Failed to fetch project');
		}

		const project = await response.json();
		return json(project);
	} catch (err) {
		if (err.status) throw err;
		throw error(500, 'Failed to fetch project');
	}
}
