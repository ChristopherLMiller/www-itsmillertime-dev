export const MODEL_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'] as const;
export type ModelStatus = (typeof MODEL_STATUSES)[number];

export const MODEL_SORT_OPTIONS = [
	{ value: '-model_meta.completionDate', label: 'Completion (newest)' },
	{ value: 'model_meta.completionDate', label: 'Completion (oldest)' },
	{ value: 'title', label: 'Title (A–Z)' },
	{ value: '-title', label: 'Title (Z–A)' },
	{ value: '-createdAt', label: 'Date added (newest)' },
	{ value: 'createdAt', label: 'Date added (oldest)' }
] as const;

export const DEFAULT_MODEL_SORT = MODEL_SORT_OPTIONS[0].value;

const ALLOWED_SORTS = new Set<string>(MODEL_SORT_OPTIONS.map((option) => option.value));
const ALLOWED_STATUSES = new Set<string>(MODEL_STATUSES);

export function normalizeModelSort(raw: string | null): string {
	const sort = raw?.trim();
	if (sort && ALLOWED_SORTS.has(sort)) return sort;
	return DEFAULT_MODEL_SORT;
}

export function normalizeModelStatus(raw: string | null): ModelStatus | null {
	const status = raw?.trim().toUpperCase();
	if (status && ALLOWED_STATUSES.has(status)) return status as ModelStatus;
	return null;
}
