import { PUBLIC_PAYLOAD_API_ENDPOINT } from '$env/static/public';
import { cacheManager } from '$lib/cache/cache';
import { json } from '@sveltejs/kit';
import * as qs from 'qs-esm';

// Background refresh function
async function refreshCacheInBackground(
	endpoint: string,
	queryParams: Record<string, string>,
	cacheKey: string
) {
	try {
		console.log('Background refresh for', cacheKey);
		const path = `${PUBLIC_PAYLOAD_API_ENDPOINT}/${endpoint}?${qs.stringify(queryParams)}`;
		const response = await fetch(path);
		const data = await response.json();
		await cacheManager.set(cacheKey, data);
		console.log('Background refresh completed for', cacheKey);
	} catch (error) {
		console.error('Background refresh failed for', cacheKey, error);
	}
}

export async function GET({ url, fetch }) {
	console.log(`Request: ${url.toString()}`);
	try {
		// Extract out the endpoint and query params
		const { endpoint, ...queryParams } = Object.fromEntries(url.searchParams.entries());
		const isCaching = url.searchParams.get('cache') !== 'false';
		const forceRefresh = url.searchParams.get('refresh') === 'true';

		// Make sure endpoint was provided
		if (!endpoint) {
			return json({ error: 'Endpoint is required' }, { status: 400 });
		}

		// Create cache key
		const cacheKey = cacheManager.createKey(endpoint, queryParams);

		// Check if we should force refresh
		if (forceRefresh) {
			console.log('Force refresh requested for', cacheKey);
			const path = `${PUBLIC_PAYLOAD_API_ENDPOINT}/${endpoint}?${qs.stringify(queryParams)}`;
			const response = await fetch(path);
			const data = await response.json();

			if (isCaching) {
				await cacheManager.set(cacheKey, data);
			}

			return json(data, { headers: { 'X-Cache': 'REFRESHED' } });
		}

		// Check if the key exists in the cache
		const cachedData = await cacheManager.get(cacheKey);
		if (cachedData) {
			console.log('Cache hit on', cacheKey);

			// Trigger background refresh if cache is getting stale (older than 5 minutes)
			// This will refresh the cache without blocking the response
			if (isCaching) {
				const isStale = await cacheManager.isCacheStale(cacheKey, 300); // 5 minutes
				if (isStale) {
					console.log('Cache is stale, triggering background refresh for', cacheKey);
					// Fire off background refresh (don't await)
					refreshCacheInBackground(endpoint, queryParams, cacheKey).catch((error) => {
						console.error('Background refresh error:', error);
					});
				}
			}

			return json(cachedData, { headers: { 'X-Cache': 'HIT' } });
		}

		// Cache miss - fetch from Payload API
		console.log('Cache miss on', cacheKey);
		const path = `${PUBLIC_PAYLOAD_API_ENDPOINT}/${endpoint}?${qs.stringify(queryParams)}`;
		const response = await fetch(path);
		const data = await response.json();

		// If caching is enabled, add to cache
		if (isCaching) {
			await cacheManager.set(cacheKey, data);
		}

		// Return the data
		return json(data, { headers: { 'X-Cache': 'MISS' } });
	} catch (error) {
		console.error(error);
		return json({ error: 'Failed to fetch data from Payload API' }, { status: 500 });
	}
}
