import { error } from '@sveltejs/kit';
import { z } from 'zod';

export class ValidationError extends Error {
	constructor(public zodError: z.ZodError) {
		super('Validation failed');
		this.name = 'ValidationError';
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
export const payloadClient = new PayloadApiClient('https://cms.itsmillertime.dev/api');
