#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import { createHash } from 'crypto';
import { config as envConfig } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path, { dirname, join } from 'path';

envConfig();

interface Config {
	payloadUrl: string;
	outputPath: string;
	outputPathZod: string;
	timeout: number;
	retries: number;
}

const config: Config = {
	payloadUrl:
		process.env.PAYLOAD_TYPES_URL ||
		'https://raw.githubusercontent.com/ChristopherLMiller/cms-itsmillertime-dev/refs/heads/main/src/payload-types.ts',
	outputPath: './src/lib/types/payload-types.ts',
	outputPathZod: './src/lib/schemas/zod/generated.ts',
	timeout: 10000,
	retries: 3
};

class PayloadTypesSyncer {
	private config: Config;
	private cacheFile: string;

	constructor(config: Config) {
		this.config = config;
		this.cacheFile = join(dirname(config.outputPath), '.types-cache.json');
	}

	private async fetchWithRetry(url: string, retries: number): Promise<string> {
		for (let i = 0; i < retries; i++) {
			try {
				console.log(`🔄 Attempt ${i + 1}/${retries}: Fetching types from ${url}`);

				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

				const response = await fetch(url, {
					signal: controller.signal,
					headers: {
						'User-Agent': 'SvelteKit-Types-Syncer/1.0'
					}
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				return await response.text();
			} catch (error) {
				console.warn(`⚠️  Attempt ${i + 1} failed:`, error.message);

				if (i === retries - 1) {
					throw error;
				}

				// Exponential backoff
				const delay = Math.pow(2, i) * 1000;
				console.log(`⏱️  Retrying in ${delay}ms...`);
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}

		throw new Error('All retry attempts failed');
	}

	private getContentHash(content: string): string {
		return createHash('sha256').update(content).digest('hex');
	}

	private loadCache(): { hash?: string; timestamp?: number } {
		try {
			if (existsSync(this.cacheFile)) {
				return JSON.parse(readFileSync(this.cacheFile, 'utf8'));
			}
		} catch (error) {
			console.warn('⚠️  Could not load cache:', error.message);
		}
		return {};
	}

	private saveCache(hash: string): void {
		try {
			const cache = {
				hash,
				timestamp: Date.now()
			};
			writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
		} catch (error) {
			console.warn('⚠️  Could not save cache:', error.message);
		}
	}

	private loadPackageDependencies() {
		const packageJsonPath = path.join(process.cwd(), 'package.json');
		const packageJsonContents = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

		return {
			dependencies: packageJsonContents.dependencies || {},
			devDependencies: packageJsonContents.devDependencies || {},
			peerDependencies: packageJsonContents.peerDependencies || {}
		};
	}

	private async updateZodSchmea(typesContent: string): Promise<void> {
		const dependencies = this.loadPackageDependencies();
		const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
		if (!anthropicApiKey) {
			throw new Error('ANTHROPIC_API_KEY environment variable is required');
		}

		const prompt = `Convert the following TypeScript types to zod schemas.  I am using TypeScript version ${dependencies.devDependencies.typescript} and zod version ${dependencies.dependencies.zod}

		Please:
		1. Import zod with: import { z } from 'zod'
		2. Convert each type/interface to a corresponding Zod schema
		3. Export each schema with a clear name (e.g., UserSchema for User type)
		4. Maintain the same validation rules and optional/required fields
		5. Add appropriate Zod validators for specific types (email, dates, etc.)
		6. Handle union types, arrays, nested objects, and enums properly
		7. Add JSDoc comments explaining each schema
		8. Make sure that the return type of each is explicit
		9. Tuples do not require a length as they are defined by the number of elements

		${typesContent}

		Return only the Zod schema code, ready to use.`;

		const anthropic = new Anthropic({ apiKey: anthropicApiKey });

		console.log('Streaming response from Anthropic');
		const stream = anthropic.messages.stream({
			model: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
			max_tokens: 64000,
			stream: true,
			messages: [
				{
					role: 'user',
					content: prompt
				}
			]
		});

		let zodSchema = '';
		stream.on('text', (text) => {
			process.stdout.write('.');
			zodSchema += text;
		});

		await stream.done();
		console.log('\n✅ Streaming complete');

		const cleanedSchema = zodSchema
			.replace(/^```(?:typescript|javascript|ts|js)?\n?/gm, '')
			.replace(/^```\n?/gm, '')
			.trim();

		this.ensureDirectoryExists(this.config.outputPathZod);
		writeFileSync(this.config.outputPathZod, cleanedSchema, 'utf8');
		console.log(`✅ Zod schema written to: ${this.config.outputPathZod}`);
	}

	private ensureDirectoryExists(filePath: string): void {
		const dir = dirname(filePath);
		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
			console.log(`📁 Created directory: ${dir}`);
		}
	}
	async sync(force: boolean = false): Promise<void> {
		try {
			const typesContent = await this.fetchWithRetry(this.config.payloadUrl, this.config.retries);

			const contentHash = this.getContentHash(typesContent);
			const cache = this.loadCache();

			if (!force && cache.hash === contentHash) {
				console.log('✅ Types are up to date (no changes detected)');
				return;
			}

			this.ensureDirectoryExists(this.config.outputPath);

			writeFileSync(this.config.outputPath, typesContent, 'utf8');
			this.updateZodSchmea(typesContent);
			this.saveCache(contentHash);

			const lines = typesContent.split('\n').length;
			const size = Math.round(typesContent.length / 1024);

			console.log('✅ Types successfully updated!');
			console.log(`📄 ${lines} lines, ${size}KB written to ${this.config.outputPath}`);

			if (cache.hash) {
				console.log('🔄 Changes detected and applied');
			} else {
				console.log('🆕 Initial types file created');
			}
		} catch (error) {
			console.error('❌ Failed to sync types:', error.message);

			// Try to use existing types file if available
			if (existsSync(this.config.outputPath)) {
				console.log('📄 Using existing types file as fallback');
				return;
			}

			process.exit(1);
		}
	}
}

// CLI execution
async function main() {
	const args = process.argv.slice(2);
	const force = args.includes('--force') || args.includes('-f');
	const watch = args.includes('--watch') || args.includes('-w');

	const syncer = new PayloadTypesSyncer(config);

	if (watch) {
		console.log('👀 Watching for changes...');
		console.log('Press Ctrl+C to stop');

		await syncer.sync();

		setInterval(async () => {
			try {
				await syncer.sync();
			} catch (error) {
				console.error('Watch sync failed:', error.message);
			}
		}, 30000); // Check every 30 seconds
	} else {
		await syncer.sync(force);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}

export { PayloadTypesSyncer };
