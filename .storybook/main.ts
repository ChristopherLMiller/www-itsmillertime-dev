import type { StorybookConfig } from '@storybook/sveltekit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dirname = path.dirname(fileURLToPath(import.meta.url));

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
		config.envDir = dirname;
		return config;
	}
};
export default config;
