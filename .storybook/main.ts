import type { StorybookConfig } from '@storybook/sveltekit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

	const storybookDir = path.dirname(fileURLToPath(import.meta.url));
	// Use the app root so Storybook reads the same `.env`, `.env.local`, `.env.production`
	// as Vite/SvelteKit (nothing Storybook-specific in git).
	const projectRoot = path.join(storybookDir, '..');

	const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@chromatic-com/storybook',
		'@storybook/addon-vitest',
		'@storybook/addon-docs'
	],
	framework: '@storybook/sveltekit',
	staticDirs: ['../static'],
	async viteFinal(config) {
		config.envDir = projectRoot;
		return config;
	}
};
export default config;
