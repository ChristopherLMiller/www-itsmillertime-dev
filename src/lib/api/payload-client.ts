import { error } from '@sveltejs/kit';
import { config } from 'dotenv';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

export class ValidationError extends Error {
	constructor(public zodError: z.ZodError) {
		super('Validation failed');
		this.name = 'ValidationError';
	}
}
function logToFile(message: unknown, data?: any) {
	if (process.env.NODE_ENV !== 'development') return;

	try {
		// Create the logs directory if it doesn't exist
		const logsDir = join(process.cwd(), 'logs');
		mkdirSync(logsDir, { recursive: true });

		// create timestamp for filename
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const filename = 'validation-errors-' + timestamp + '.log';
		const filepath = join(logsDir, filename);

		const logEntry = {
			timestamp: new Date().toISOString(),
			message,
			data
		};

		const logContent = JSON.stringify(logEntry, null, 2);
		writeFileSync(filepath, logContent, 'utf8');
	} catch (err) {
		console.error('Failed to log validation error:', err);
		console.error(message, data);
	}
}
export function validateServerData<T>(
	schema: z.ZodSchema<T>,
	data: unknown,
	errorMessage: string = 'Invalid data received from API'
): T {
	try {
		return schema.parse(data);
	} catch (err) {
		if (err instanceof z.ZodError) {
			logToFile({ errors: err.errors, data });
			console.error('Server validation failed:', {
				errors: err.errors,
				data: JSON.stringify(data, null, 2)
			});
			console.dir(err.errors, { maxArrayLength: null });

			// In development show detailed errors
			if (process.env.NODE_ENV === 'development') {
				throw error(500, {
					message: `${errorMessage}: ${err.errors.map((e) => `${e.path}: ${e.message}`).join(', ')}`
				});
			}

			// In prouction, generic error
			throw error(500, errorMessage);
		}
		throw err;
	}
}

export function safeValidateServerData<T>(
	schema: z.ZodSchema<T>,
	data: unknown
): {
	success: boolean;
	data?: T;
	errors?: z.ZodError;
} {
	const result = schema.safeParse(data);
	return {
		success: result.success,
		data: result.success ? result.data : undefined,
		errors: result.success ? undefined : result.error
	};
}

export class PayloadApiClient {
	private baseURL: string;

	constructor(baseURL: string) {
		this.baseURL = baseURL;
	}

	async fetchWithValidation<T>(
		endpoint: string,
		schema: z.ZodSchema<T>,
		options: RequestInit = {}
	): Promise<T> {
		try {
			console.log(`${this.baseURL}${endpoint}`);
			const response = await fetch(`${this.baseURL}${endpoint}`, {
				headers: {
					'Content-Type': 'application/json',
					...options.headers
				},
				...options
			});

			if (!response.ok) {
				throw error(response.status, `API request failed: ${response.statusText}`);
			}

			const rawData = await response.json();
			return validateServerData(schema, rawData, `Invalid data from ${endpoint}`);
		} catch (error) {
			if (error instanceof ValidationError) {
				throw error;
			}
		}

		console.error(`API request failed for ${endpoint}:`, error);
		throw error(500, `Failed to fetch data from ${endpoint}`);
	}
}

config();

export const payloadClient = new PayloadApiClient(process.env.PUBLIC_PAYLOAD_API_ENDPOINT);
//export const payloadClient = new PayloadApiClient('http://localhost:3000/api');
