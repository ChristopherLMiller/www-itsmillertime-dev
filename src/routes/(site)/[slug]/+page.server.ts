import { FetchFromStrapi } from '../../../utilities/fetch';

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

	const response = await FetchFromStrapi({ path: 'pages', queryParams });
	const page = response.data[0];
	return { page: page, meta: page.seo };
}
