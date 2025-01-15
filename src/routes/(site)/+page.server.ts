import { FetchFromStrapi } from '../../utilities/fetch';

export async function load() {
	const queryParams = {
		filters: {
			slug: {
				$eq: 'home'
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
