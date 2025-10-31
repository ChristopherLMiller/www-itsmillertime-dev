import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { cacheManager } from '$lib/cache/cache';
import { json } from '@sveltejs/kit';
import * as qs from 'qs-esm';

export async function POST({ url, fetch, request }) {
	try {
		const body = await request.json();
		const { endpoint, queryParams = {} } = body;

		if (!endpoint) {
			return json({ error: 'Endpoint is required' }, { status: 400 });
		}

		const cacheKey = cacheManager.createKey(endpoint, queryParams);
		console.log('Manual cache refresh requested for', cacheKey);

		// Fetch fresh data from Payload API
		const path = `${PUBLIC_PAYLOAD_API_ENDPOINT}/${endpoint}?${qs.stringify(queryParams)}`;
		const response = await fetch(path);

		if (!response.ok) {
			return json({ error: 'Failed to fetch from Payload API' }, { status: response.status });
		}

		const data = await response.json();

		// Update cache with fresh data
		await cacheManager.set(cacheKey, data);

		return json({
			success: true,
			message: 'Cache refreshed successfully',
			cacheKey,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Cache refresh error:', error);
		return json({ error: 'Failed to refresh cache' }, { status: 500 });
	}
}

export async function GET({ url }) {
	return json({
		message: 'Use POST method to refresh cache',
		example: {
			endpoint: 'posts',
			queryParams: { limit: 10 }
		}
	});
}
