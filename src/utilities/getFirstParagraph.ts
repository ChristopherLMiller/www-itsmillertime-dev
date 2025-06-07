export const getFirstParagraph = (contents: unknown) => {
	if (!contents || !contents.root || !contents.root.children) return '';
	const paragraphs = contents.root.children.filter((child) => child.type === 'paragraph');

	if (paragraphs.length > 0) {
		if (paragraphs[0].children.length > 0) {
			return paragraphs[0].children[0].text;
		}
	}
};
