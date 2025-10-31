/**
 * Utility functions for cache management
 */

export interface CacheRefreshOptions {
	endpoint: string;
	queryParams?: Record<string, string>;
}

/**
 * Manually refresh a cache entry
 */
export async function refreshCache(options: CacheRefreshOptions): Promise<boolean> {
	try {
		const response = await fetch('/api/payload/refresh', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(options)
		});

		if (!response.ok) {
			console.error('Cache refresh failed:', response.statusText);
			return false;
		}

		const result = await response.json();
		console.log('Cache refresh successful:', result);
		return true;
	} catch (error) {
		console.error('Cache refresh error:', error);
		return false;
	}
}

/**
 * Force refresh a cache entry by adding refresh=true parameter
 */
export function getRefreshUrl(endpoint: string, queryParams?: Record<string, string>): string {
	const params = new URLSearchParams();
	params.set('endpoint', endpoint);
	params.set('refresh', 'true');

	if (queryParams) {
		Object.entries(queryParams).forEach(([key, value]) => {
			params.set(key, value);
		});
	}

	return `/api/payload?${params.toString()}`;
}

/**
 * Get cache status for debugging
 */
export async function getCacheStatus(
	endpoint: string,
	queryParams?: Record<string, string>
): Promise<any> {
	try {
		const params = new URLSearchParams();
		params.set('endpoint', endpoint);
		params.set('cache', 'false'); // Don't cache this request

		if (queryParams) {
			Object.entries(queryParams).forEach(([key, value]) => {
				params.set(key, value);
			});
		}

		const response = await fetch(`/api/payload?${params.toString()}`);
		const headers = Object.fromEntries(response.headers.entries());

		return {
			cacheStatus: headers['x-cache'],
			responseTime: headers['x-response-time'],
			timestamp: new Date().toISOString()
		};
	} catch (error) {
		console.error('Error getting cache status:', error);
		return { error: 'Failed to get cache status' };
	}
}
