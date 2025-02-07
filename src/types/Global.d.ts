import type { Navigation } from './Navigation';
import type { SiteMeta } from './SiteMeta';

export interface Global {
	id: number;
	documentId: string;
	createdAt: Date;
	updatedAt: Date;
	publishedAt: Date;
	siteMeta: SiteMeta[];
	navigation: Navigation[];
}
