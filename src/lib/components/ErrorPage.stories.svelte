<script module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import ErrorPage from './ErrorPage.svelte';

	const { Story } = defineMeta({
		title: 'Pages/ErrorPage',
		component: ErrorPage,
		tags: ['autodocs']
	});
</script>

<Story
	name="NotFound"
	parameters={{
		sveltekit_experimental: {
			state: {
				page: {
					status: 404,
					error: { message: 'Not found' }
				}
			}
		}
	}}
/>

<Story
	name="Forbidden"
	parameters={{
		sveltekit_experimental: {
			state: {
				page: {
					status: 403,
					error: { message: 'Forbidden' }
				}
			}
		}
	}}
/>

<Story
	name="ServerError"
	parameters={{
		sveltekit_experimental: {
			state: {
				page: {
					status: 500,
					error: { message: 'Database connection failed' }
				}
			}
		}
	}}
/>
