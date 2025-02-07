export interface Navigation {
	id: number;
	documentId: string;
	title: string;
	path: string;
	createdAt: Date;
	updatedAt: Date;
	publishedAt: Date;
	authState: string;
	order: number;
}
