type ExcerptUnit = 'sentences' | 'paragraphs';

interface ExcerptOptions {
	unit: ExcerptUnit;
	count: number;
}

/**
 * Extracts a specified number of sentences or paragraphs from markdown text.
 *
 * @param markdown - The markdown text to process
 * @param options - Configuration object specifying unit (sentences/paragraphs) and count
 * @returns The extracted text with markdown formatting preserved
 */
export const getMarkdownExcerpt = (markdown: string, options: ExcerptOptions): string => {
	const { unit, count } = options;

	// Remove code blocks to avoid false positives
	const withoutCode = markdown.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');

	if (unit === 'paragraphs') {
		// Match paragraphs (text between double newlines or at start/end of text), excluding all headers
		const paragraphRegex = /(?:^|\n\n)(?!#|>|-|\*|```)([\s\S]*?)(?=\n\n|$)/;
		const paragraphs = withoutCode.match(paragraphRegex)?.filter((p) => p.trim()) || [];

		// Get original markdown up to the end of the last paragraph we want
		const selectedParagraphs = paragraphs.slice(0, count);
		if (selectedParagraphs.length === 0) return '';

		// Find these paragraphs in the original markdown
		let excerpt = '';
		let lastIndex = 0;

		for (const paragraph of selectedParagraphs) {
			const nextIndex = markdown.indexOf(paragraph, lastIndex);
			if (nextIndex === -1) continue;

			excerpt += markdown.substring(lastIndex, nextIndex + paragraph.length);
			lastIndex = nextIndex + paragraph.length;

			// Add newlines between paragraphs
			if (lastIndex < markdown.length && !excerpt.endsWith('\n\n')) {
				excerpt += '\n\n';
			}
		}

		return excerpt.trim();
	} else {
		// Handle sentences
		const sentenceRegex = /[^.!?]+[.!?]+(?:\s|$)/g;
		const sentences = withoutCode.match(sentenceRegex) || [];

		let excerpt = '';
		let sentenceCount = 0;
		let lastIndex = 0;

		for (const sentence of sentences) {
			if (sentenceCount >= count) break;

			const nextIndex = markdown.indexOf(sentence, lastIndex);
			if (nextIndex === -1) continue;

			excerpt += markdown.substring(lastIndex, nextIndex + sentence.length);
			lastIndex = nextIndex + sentence.length;
			sentenceCount++;
		}

		return excerpt.trim();
	}
};
