import type { CmsContentEvent } from '$lib/cms-events/types';

/**
 * TanStack query-key prefixes to invalidate for a CMS collection event.
 * Prefix match: `['articles']` invalidates every articles-list query.
 */
export function queryKeysForCmsEvent(event: CmsContentEvent): readonly (readonly unknown[])[] {
	switch (event.collection) {
		case 'posts':
			return event.slug
				? [['articles'], ['article', event.slug]]
				: [['articles'], ['article']];
		case 'posts-categories':
		case 'posts-tags':
			return [['articles'], ['article']];
		case 'models':
			return event.slug
				? [['models'], ['model', event.slug]]
				: [['models'], ['model']];
		case 'manufacturers':
		case 'scales':
		case 'models-tags':
		case 'kits':
			return [['models'], ['model']];
		case 'projects':
		case 'projects-categories':
		case 'projects-technologies':
			return [['projects']];
		case 'pages':
			return event.slug ? [['page', event.slug]] : [['page']];
		case 'gardens':
			return event.slug
				? [['gardens'], ['garden', event.slug]]
				: [['gardens'], ['garden']];
		case 'gallery-albums':
			return event.slug
				? [['galleries'], ['gallery', event.slug]]
				: [['galleries'], ['gallery']];
		case 'gallery-images':
		case 'gallery-tags':
		case 'gallery-categories':
			return [['galleries'], ['gallery']];
		case 'map-markers':
			return [['parks']];
		default:
			return [];
	}
}

/** SvelteKit `depends()` names still used by gallery routes during/after migration. */
export function svelteInvalidationIdsForCmsEvent(event: CmsContentEvent): string[] {
	switch (event.collection) {
		case 'gallery-albums':
		case 'gallery-images':
		case 'gallery-tags':
		case 'gallery-categories':
			return ['app:galleries-list', 'app:gallery-album'];
		default:
			return [];
	}
}

export function shouldBustLayoutServerCache(event: CmsContentEvent): boolean {
	return event.collection === 'media';
}
