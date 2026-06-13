export const getFirstParagraph = (contents: unknown) => {
	if (contents == null || typeof contents !== 'object') return '';
	const root = (contents as { root?: { children?: unknown[] } }).root;
	if (!root?.children?.length) return '';
	const paragraphs = root.children.filter(
		(child) =>
			typeof child === 'object' &&
			child !== null &&
			(child as { type?: string }).type === 'paragraph'
	);
	if (paragraphs.length === 0) return '';
	const first = paragraphs[0] as { children?: { text?: string }[] };
	if (first.children && first.children.length > 0 && typeof first.children[0].text === 'string') {
		return first.children[0].text;
	}
	return '';
};
