import { env } from '$env/dynamic/private';
import { error, isHttpError, json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ params }) {
	const { CLOCKIFY_API_KEY, CLOCKIFY_WORKSPACE_ID } = env;
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
		if (isHttpError(err)) throw err;
		throw error(500, 'Failed to fetch project');
	}
}
