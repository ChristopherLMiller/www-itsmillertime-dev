import type { PostCategory } from './PostCategory';
import type { SEO } from './SEO';

export interface Post {
	id: number;
	documentId: string;
	title: string;
	slug: string;
	wordCount: number;
	content: string;
	createdAt: Date;
	updatedAt: Date;
	publishedAt: Date;
	publicationDate: Date;
	seo: SEO;
	postCategory: PostCategory;
}
