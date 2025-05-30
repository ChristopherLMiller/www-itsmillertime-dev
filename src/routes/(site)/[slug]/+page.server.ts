import { cacheManager } from '$lib/cache/cache';
import { error } from '@sveltejs/kit';
import type { Page } from '../../../types/Page.js';

// src/routes/+page.js
export async function load({ params }) {
	const queryParams = {
		filters: {
			slug: {
				$eq: params.slug
			}
		},
		populate: {
			seo: true
		}
	};
	const response = await cacheManager.fetch<Page[]>('pages', queryParams, params.slug);

	// If data length is 0, that means we have a 404
	if (response.data.length === 0) {
		throw error(404, 'Page not found');
	}

	// Extract the page data from the response and return it
	const page = response.data[0];
	return { page: page, meta: page.seo };
}
