import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: [vitePreprocess()],

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		adapter: adapter(),
		// Production Node server: set BODY_SIZE_LIMIT (e.g. 16M in .env) so Web Share Target
		// multipart POSTs are not rejected by adapter-node before they reach routes (default 512K).
		// Web Share Target POSTs use multipart/form-data and often omit or mismatch `Origin`; SvelteKit
		// would otherwise return 403 "Cross-site POST form submissions are forbidden" in production.
		// `['*']` disables origin checks for form-like POSTs (see kit.csrf in SvelteKit docs).
		csrf: {
			trustedOrigins: ['*']
		}
	},

	extensions: ['.svelte', '.svx']
};

export default config;
