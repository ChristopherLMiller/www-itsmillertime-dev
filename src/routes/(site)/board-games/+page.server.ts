import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

async function fetchBGGCollection(
	username: string,
	stats: 0 | 1,
	retryCount = 0
): Promise<{ games: any[]; total: number; error?: string }> {
	const maxRetries = 5;
	const retryDelay = 3000;
	const { BGG_API_TOKEN } = env;

	try {
		if (!BGG_API_TOKEN) {
			console.warn('BGG_API_TOKEN not set in environment variables');
			return {
				games: [],
				total: 0,
				error: 'BoardGameGeek API token not configured. Please add BGG_API_TOKEN to your .env file.'
			};
		}

		const url = `https://cms.itsmillertime.dev/api/bgg/collection?username=${encodeURIComponent(username)}&stats=${stats}`;
		console.log('Fetching BGG collection:', url);

		const response = await fetch(url);

		console.log('BGG Response status:', response.status);

		// Handle 202 - BGG is queuing the request
		if (response.status === 202) {
			if (retryCount < maxRetries) {
				console.log(
					`Request queued (202), retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`
				);
				await new Promise((resolve) => setTimeout(resolve, retryDelay));
				return fetchBGGCollection(username, stats, retryCount + 1);
			} else {
				return {
					games: [],
					total: 0,
					error: 'BGG took too long to prepare your collection. Please try again later.'
				};
			}
		}

		if (!response.ok) {
			const errorText = await response.text();
			console.error('BGG API Error:', response.status, errorText);
			return {
				games: [],
				total: 0,
				error: `BGG API returned ${response.status}. Check that your API token is valid.`
			};
		}

		const data = await response.json();

		if (data.error) {
			return { games: [], total: 0, error: data.error };
		}

		const games = data.docs ?? [];
		console.log('Found', games.length, 'games');

		return {
			games,
			total: data.totalDocs ?? games.length
		};
	} catch (error) {
		console.error('Error fetching BGG collection:', error);
		return {
			games: [],
			total: 0,
			error: error instanceof Error ? error.message : 'Failed to load collection'
		};
	}
}

export const load: PageServerLoad = async ({ url, parent }) => {
	const { session } = await parent();
	const defaultUsername = session?.user?.bggUsername ?? 'moose517';
	const username = url.searchParams.get('username') || defaultUsername;
	const statsParam = url.searchParams.get('stats');
	const stats: 0 | 1 = statsParam === '1' ? 1 : 0;
	const result = await fetchBGGCollection(username, stats);

	return {
		username,
		stats,
		games: result.games,
		total: result.total,
		error: result.error
	};
};
