export type RelatedResourceLink = {
	id: number;
	title: string;
	slug: string;
};

type Relatable = {
	id: number;
	title?: string | null;
	slug?: string | null;
};

/** Keep populated relationship docs that have a title + slug for linking. */
export function toRelatedLinks(
	items: (number | Relatable)[] | null | undefined
): RelatedResourceLink[] {
	const links: RelatedResourceLink[] = [];
	for (const item of items ?? []) {
		if (typeof item !== 'object' || item == null) continue;
		if (!item.title || !item.slug) continue;
		links.push({ id: item.id, title: item.title, slug: item.slug });
	}
	return links;
}
