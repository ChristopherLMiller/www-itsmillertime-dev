export interface Page {
	id: number;
	documentId: string;
	title: string;
	slug: string;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	publishedAt: Date;
}
