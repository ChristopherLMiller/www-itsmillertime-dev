import type {
	GalleryAlbum,
	Garden,
	Media,
	Model,
	Post,
	PostsCategory,
	PostsTag
} from '$lib/types/payload-types';

/** Minimal Lexical document for stories that render rich text */
export const sampleLexicalParagraph = {
	root: {
		type: 'root',
		children: [
			{
				type: 'paragraph',
				children: [{ type: 'text', text: 'Example paragraph for Storybook.', format: 0 }],
				direction: 'ltr' as const,
				format: '' as const,
				indent: 0,
				version: 1
			}
		],
		direction: 'ltr' as const,
		format: '' as const,
		indent: 0,
		version: 1
	}
};

export const storybookImageMedia: Media = {
	id: 1,
	alt: 'Placeholder',
	url: '/logo.svg',
	mimeType: 'image/svg+xml',
	width: 400,
	height: 300,
	updatedAt: '',
	createdAt: '',
	sizes: {
		thumbnail: { url: '/logo.svg', width: 150, height: 112, mimeType: 'image/svg+xml' },
		small: { url: '/logo.svg', width: 400, height: 300, mimeType: 'image/svg+xml' }
	}
};

/** YouTube URL for media player / embed previews */
export const storybookYouTubeMedia: Media = {
	...storybookImageMedia,
	url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
	mimeType: null
};

export const storybookModel: Model = {
	id: 1,
	title: 'Test model',
	slug: 'test-model',
	clockify_project: null,
	model_meta: {
		featuredImage: storybookImageMedia,
		status: 'COMPLETED',
		completionDate: '2024-06-01T00:00:00.000Z',
		kit: {
			id: 1,
			full_title: 'Test Kit',
			title: 'Test Kit',
			kit_number: '12345',
			year_released: 2020,
			manufacturer: { id: 1, title: 'Acme Models', updatedAt: '', createdAt: '' },
			scale: { id: 1, title: '1:35', updatedAt: '', createdAt: '' },
			updatedAt: '',
			createdAt: ''
		},
		tags: [{ id: 1, title: 'Armor', slug: 'armor', updatedAt: '', createdAt: '' }]
	},
	updatedAt: '',
	createdAt: ''
};

export const storybookGalleryAlbum: GalleryAlbum = {
	id: 1,
	slug: 'sample-gallery',
	title: 'Sample gallery',
	settings: {
		visibility: 'ALL',
		category: { id: 1, title: 'Travel', updatedAt: '', createdAt: '' },
		tags: [{ id: 1, title: 'Summer', updatedAt: '', createdAt: '' }]
	},
	content: sampleLexicalParagraph,
	updatedAt: '2024-01-01T00:00:00.000Z',
	createdAt: '2024-01-01T00:00:00.000Z'
};

export const storybookPostsCategory: PostsCategory = {
	id: 1,
	title: 'Notes',
	slug: 'notes',
	updatedAt: '',
	createdAt: ''
};

export const storybookPostsTag: PostsTag = {
	id: 1,
	title: 'Dev',
	slug: 'dev',
	updatedAt: '',
	createdAt: ''
};

export const storybookPost: Post = {
	id: 1,
	title: 'Example article',
	slug: 'example-article',
	word_count: 500,
	originalPublicationDate: '2024-01-15T12:00:00.000Z',
	featuredImage: storybookImageMedia,
	content: sampleLexicalParagraph,
	category: storybookPostsCategory,
	updatedAt: '',
	createdAt: ''
};

/** Enough posts to fill hero + secondary + columns + “more” in NewspaperArticlesContent */
export const storybookNewspaperPosts: Post[] = Array.from({ length: 12 }, (_, i) => ({
	...storybookPost,
	id: i + 1,
	slug: `storypost-${i + 1}`,
	title: `Story headline ${i + 1}`,
	meta: {
		description: i === 0 ? 'Lead subhead for the main story.' : undefined,
		image: i % 2 === 0 ? storybookImageMedia : undefined
	},
	featuredImage: i % 3 === 0 ? null : storybookImageMedia,
	content: sampleLexicalParagraph,
	category: storybookPostsCategory,
	tags: [storybookPostsTag],
	originalPublicationDate: new Date(2024, 0, 15 + i).toISOString()
}));

export const storybookGarden: Garden = {
	id: 1,
	slug: 'sample-garden',
	name: 'Sample garden entry',
	featuredImage: storybookImageMedia,
	content: sampleLexicalParagraph,
	updatedAt: '',
	createdAt: ''
};
