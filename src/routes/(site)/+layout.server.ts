import { cacheManager } from '$lib/cache/cache.js';

export async function load() {
	try {
		const queryParams = {
			populate: {
				navigation: {
					populate: {
						children: true,
						icon: {
							fields: ['url']
						}
					}
				},
				siteMeta: {
					sort: ['path:asc']
				}
			}
		};
		const globalData = await cacheManager.fetch('global', queryParams);

		if (globalData.data) {
			return {
				navigation: globalData.data.navigation,
				siteMeta: globalData.data.siteMeta
			};
		}
	} catch (error) {
		return {
			error: "Couldn't fetch global data"
		};
	}
}
