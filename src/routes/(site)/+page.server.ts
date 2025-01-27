import { cacheManager } from '$lib/cache/cache';

export async function load() {
	const queryParams = {
		filters: {
			slug: {
				$eq: 'home'
			}
		},
		populate: {
			seo: {
				populate: {
					metaImage: true,
					metaSocial: true
				}
			}
		}
	};

	const response = await cacheManager.fetch('pages', queryParams, 'home');
	const page = response.data[0];
	return { page: page, meta: page.seo };
}
