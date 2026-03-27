/// <reference types="vitest/config" />
import { sveltekit } from '@sveltejs/kit/vite';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'node:path';
import { defineConfig, mergeConfig } from 'vitest/config';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

const dirname = path.dirname(fileURLToPath(import.meta.url));

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

const sharedVite = defineConfig({
	plugins: [sveltekit()],
	define: {
		PKG: pkg
	},
	server: {
		fs: {
			allow: [fileURLToPath(new URL('.', import.meta.url))]
		}
	},
	ssr: {
		noExternal: ['svelte-bricks']
	}
});

export default mergeConfig(
	sharedVite,
	defineConfig({
		test: {
			coverage: {
				provider: 'v8',
				reporter: ['text', 'html', 'lcov'],
				include: ['src/lib/**/*.{ts,svelte}'],
				exclude: ['src/lib/types/**', '**/*.stories.svelte', '**/*.test.ts', 'src/storybook/**']
			},
			projects: [
				{
					extends: true,
					plugins: [
						storybookTest({
							configDir: path.join(dirname, '.storybook')
						})
					],
					test: {
						name: 'storybook',
						browser: {
							enabled: true,
							headless: true,
							provider: playwright({}),
							instances: [{ browser: 'chromium' }]
						}
					}
				},
				{
					extends: true,
					test: {
						name: 'unit',
						environment: 'node',
						include: ['src/**/*.test.ts']
					}
				}
			]
		}
	})
);
