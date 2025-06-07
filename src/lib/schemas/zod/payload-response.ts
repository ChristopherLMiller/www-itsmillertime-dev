import { z } from 'zod';

export const PayloadResponseSchema = <T extends z.ZodTypeAny>(docsSchema: T) =>
	z.object({
		docs: z.array(docsSchema),
		hasNextPage: z.boolean().nullable(),
		hasPrevPage: z.boolean().nullable(),
		limit: z.number(),
		nextPage: z.number().nullable(),
		page: z.number().nullable(),
		pagingCounter: z.number().nullable(),
		prevPage: z.number().nullable(),
		totalDocs: z.number(),
		totalPages: z.number()
	});

// Type inference helper
export type PayloadResponse<T> = z.infer<ReturnType<typeof PayloadResponseSchema<z.ZodType<T>>>>;
