import { cacheManager } from '$lib/cache/cache.js';
import type { Global } from '../../types/Global';

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
		const globalData = await cacheManager.fetch<Global>('global', queryParams);

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
