#!/usr/bin/env tsx

import { createHash } from 'crypto';
import { config } from 'dotenv';
import fs, { existsSync, readFileSync } from 'fs';
import path from 'path';

// Load environment variables from .env file
config();

// Types for better type safety
interface ConversionOptions {
	inputPath: string;
	outputPath?: string;
}

interface AnthropicMessage {
	role: 'user' | 'assistant';
	content: string;
}

// Check if Anthropic SDK is available, fallback to fetch
let Anthropic: any;
try {
	const anthropicModule = await import('@anthropic-ai/sdk');
	Anthropic = anthropicModule.default;
} catch (error) {
	console.log('Anthropic SDK not found, using fetch API instead');
}

async function convertTsToZod({ inputPath, outputPath }: ConversionOptions): Promise<void> {
	try {
		// Read the TypeScript file
		if (!fs.existsSync(inputPath)) {
			throw new Error(`File not found: ${inputPath}`);
		}

		const tsContent = fs.readFileSync(inputPath, 'utf-8');

		if (!tsContent.trim()) {
			throw new Error('File is empty');
		}

		console.log(`Reading TypeScript types from: ${inputPath}`);
		console.log(`File size: ${(tsContent.length / 1024).toFixed(2)} KB`);

		// Get API key from environment
		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) {
			throw new Error('ANTHROPIC_API_KEY environment variable is required');
		}

		// For very large files, we might need to split them
		if (tsContent.length > 50000) {
			console.log(
				'⚠️  Large file detected. Consider splitting into smaller chunks for better results.'
			);
		}

		const prompt = `Convert the following TypeScript types to Zod schemas.

		${tsContent}

		Return only the Zod schema code, ready to use.`;

		if (Anthropic) {
			let zodSchema = '';
			// Use Anthropic SDK with streaming
			console.log('Converting using Anthropic SDK with streaming...');
			console.log(
				'Using Anthropic model [',
				process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
				']'
			);
			const anthropic = new Anthropic({
				apiKey
			});

			console.log('Streaming response...');
			const stream = anthropic.messages.stream({
				model: process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-latest',
				max_tokens: 64000,
				stream: true,
				messages: [
					{
						role: 'user',
						content: prompt
					}
				] as AnthropicMessage[]
			});

			stream.on('text', (text) => {
				process.stdout.write(text);
				zodSchema += text;
			});

			await stream.done();

			console.log('\n✅ Streaming complete');

			// Clean up the response (remove markdown code blocks if present)
			const cleanedSchema = zodSchema
				.replace(/^```(?:typescript|javascript|ts|js)?\n?/gm, '')
				.replace(/^```\n?/gm, '')
				.trim();

			// Determine output path
			const finalOutputPath = outputPath || inputPath.replace(/\.ts$/, '.zod.ts');

			// Ensure output directory exists
			const outputDir = path.dirname(finalOutputPath);
			if (!fs.existsSync(outputDir)) {
				fs.mkdirSync(outputDir, { recursive: true });
			}

			// Write to output file
			fs.writeFileSync(finalOutputPath, cleanedSchema, 'utf-8');

			console.log(`✅ Zod schema written to: ${finalOutputPath}`);
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
		console.error('❌ Error:', errorMessage);
		process.exit(1);
	}
}

function showHelp(): void {
	console.log(`
Usage: tsx scripts/convert-to-zod.ts <input-file> [output-file]

Arguments:
  <input-file>   Path to TypeScript file containing types/interfaces
  [output-file]  Optional output path (defaults to input-file.zod.ts)

Environment Variables:
  ANTHROPIC_API_KEY  Your Anthropic API key (required)

Examples:
  tsx scripts/convert-to-zod.ts ./types/user.ts
  tsx scripts/convert-to-zod.ts ./src/types.ts ./src/schemas.ts
  npm run ts-to-zod ./types/api.ts
  
Dependencies:
  npm install tsx @anthropic-ai/sdk zod --save-dev
`);
}

function getContentHash(content: string): string {
	return createHash('sha256').update(content).digest('hex');
}

function loadCache(cacheFile): { hash?: string; timestamp?: number } {
	try {
		if (existsSync(cacheFile)) {
			return JSON.parse(readFileSync(cacheFile, 'utf8'));
		}
	} catch (error) {
		console.warn('⚠️  Could not load cache:', error.message);
	}
	return {};
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
	showHelp();
	process.exit(0);
}

const inputFile = args[0];
const outputFile = args[1];

if (!inputFile) {
	console.error('❌ Error: Input file is required');
	showHelp();
	process.exit(1);
}

console.log('🔍 Checking for changes...');
console.log('Input file:', inputFile);
const contentHash = getContentHash(inputFile);
const cache = loadCache('./src/lib/types/.types-cache.json');
console.log(cache);
console.log(cache.hash, contentHash);

if (cache.hash === contentHash) {
	console.log('✅ No changes detected, skipping conversion');
	process.exit(0);
}

// Run the conversion
await convertTsToZod({
	inputPath: inputFile,
	outputPath: outputFile
});
