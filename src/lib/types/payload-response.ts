export interface PayloadResponse<T> {
	docs: Array<T>;
	hasNextPage: boolean | null;
	hasPrevPage: boolean | null;
	limit: number;
	nextPage: number | null;
	page: number | null;
	pagingCounter: number | null;
	prevPage: number | null;
	totalDocs: number;
	totalPages: number;
}
