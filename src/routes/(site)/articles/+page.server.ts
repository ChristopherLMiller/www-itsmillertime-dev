import { FetchFromStrapi } from '../../../utilities/fetch.js';

// src/routes/+page.js
export async function load({ url }) {
	const { page = 1, pageSize = 100, category } = Object.fromEntries(url.searchParams);
	const queryParams = {
		populate: {
			seo: {
				populate: {
					metaImage: true
				}
			},
			postCategory: true
		},
		pagination: {
			page,
			pageSize
		},
		filters: {
			publicationDate: {
				$notNull: true
			},
			postCategory: {
				slug: {
					$eq: category
				}
			}
		},
		sort: ['publicationDate:desc']
	};

	const response = await FetchFromStrapi({ path: 'posts', queryParams });

	return {
		posts: response
	};
}
