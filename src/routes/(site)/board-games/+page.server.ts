import { XMLParser } from 'fast-xml-parser';
import { BGG_API_TOKEN } from '$env/static/private';
import type { PageServerLoad } from './$types';

interface BGGCollectionItem {
	objectid: string;
	name: string;
	thumbnail?: string;
	image?: string;
	yearpublished?: string;
	numplays?: string;
	stats?: {
		rating?: {
			value?: string;
		};
	};
}

interface BGGResponse {
	items: {
		item: BGGCollectionItem | BGGCollectionItem[];
	};
}

async function fetchBGGCollection(username: string, retryCount = 0): Promise<{ games: any[], total: number, error?: string }> {
	const maxRetries = 5;
	const retryDelay = 3000;

	try {
		if (!BGG_API_TOKEN) {
			console.warn('BGG_API_TOKEN not set in environment variables');
			return {
				games: [],
				total: 0,
				error: 'BoardGameGeek API token not configured. Please add BGG_API_TOKEN to your .env file.'
			};
		}

		const url = `https://boardgamegeek.com/xmlapi2/collection?username=${username}`;
		console.log('Fetching BGG collection:', url);

		const response = await fetch(url, {
			headers: {
				'Authorization': `Bearer ${BGG_API_TOKEN}`
			}
		});

		console.log('BGG Response status:', response.status);

		// Handle 202 - BGG is queuing the request
		if (response.status === 202) {
			if (retryCount < maxRetries) {
				console.log(`Request queued (202), retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
				await new Promise(resolve => setTimeout(resolve, retryDelay));
				return fetchBGGCollection(username, retryCount + 1);
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

		const xmlData = await response.text();
		console.log('XML data received, length:', xmlData.length);

		const parser = new XMLParser({
			ignoreAttributes: false,
			attributeNamePrefix: ''
		});

		const result = parser.parse(xmlData) as BGGResponse;

		// Handle both single item and array of items
		let items: BGGCollectionItem[] = [];
		if (result.items?.item) {
			items = Array.isArray(result.items.item) ? result.items.item : [result.items.item];
		}

		console.log('Found', items.length, 'games');

		// Transform the data
		const games = items.map((item) => ({
			id: item.objectid,
			name: item.name,
			thumbnail: item.thumbnail,
			image: item.image,
			yearPublished: item.yearpublished,
			numPlays: item.numplays ? parseInt(item.numplays) : 0,
			rating: item.stats?.rating?.value ? parseFloat(item.stats.rating.value) : 0
		}));

		return {
			games,
			total: games.length
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

export const load: PageServerLoad = async () => {
	const username = 'moose517';
	const result = await fetchBGGCollection(username);

	return {
		games: result.games,
		total: result.total,
		error: result.error
	};
};
