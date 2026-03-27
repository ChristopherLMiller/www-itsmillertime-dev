import type { Preview } from '@storybook/sveltekit';

import './preview.css';

const defaultStorybookUrl = new URL('https://storybook.local/');

const preview: Preview = {
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i
			}
		},
		layout: 'padded',
		sveltekit_experimental: {
			navigation: {
				goto: async () => {}
			},
			state: {
				page: {
					url: defaultStorybookUrl,
					status: 200,
					data: {
						navigation: {
							navItems: [
								{
									title: 'Home',
									link: '/',
									path: '/',
									order: 0,
									childNodes: [],
									visibility: 'ALL' as const
								},
								{
									title: 'Projects',
									link: '/projects',
									path: '/projects',
									order: 1,
									childNodes: [],
									visibility: 'ALL' as const
								},
								{
									title: 'More',
									link: '#',
									path: '/more',
									order: 2,
									childNodes: [
										{
											title: 'Articles',
											link: '/articles',
											order: 0,
											visibility: 'ALL' as const
										}
									],
									visibility: 'ALL' as const
								}
							]
						},
						siteMeta: {
							id: 1,
							siteMeta: [
								{
									title: 'Home',
									description: 'Storybook preview description for the home page.',
									path: '/'
								},
								{
									title: 'Projects',
									description: 'Storybook preview for projects.',
									path: '/projects'
								}
							]
						},
						session: null,
						meta: {
							metaTitle: 'Storybook',
							metaDescription: 'Component documentation',
							metaImage: null,
							image: null,
							canonicalURL: null
						}
					}
				}
			}
		}
	}
};

export default preview;
