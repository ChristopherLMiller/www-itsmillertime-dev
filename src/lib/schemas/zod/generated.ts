import { z } from 'zod';

// Supported timezones enum
export const SupportedTimezonesSchema = z.enum([
	'Pacific/Midway',
	'Pacific/Niue',
	'Pacific/Honolulu',
	'Pacific/Rarotonga',
	'America/Anchorage',
	'Pacific/Gambier',
	'America/Los_Angeles',
	'America/Tijuana',
	'America/Denver',
	'America/Phoenix',
	'America/Chicago',
	'America/Guatemala',
	'America/New_York',
	'America/Bogota',
	'America/Caracas',
	'America/Santiago',
	'America/Buenos_Aires',
	'America/Sao_Paulo',
	'Atlantic/South_Georgia',
	'Atlantic/Azores',
	'Atlantic/Cape_Verde',
	'Europe/London',
	'Europe/Berlin',
	'Africa/Lagos',
	'Europe/Athens',
	'Africa/Cairo',
	'Europe/Moscow',
	'Asia/Riyadh',
	'Asia/Dubai',
	'Asia/Baku',
	'Asia/Karachi',
	'Asia/Tashkent',
	'Asia/Calcutta',
	'Asia/Dhaka',
	'Asia/Almaty',
	'Asia/Jakarta',
	'Asia/Bangkok',
	'Asia/Shanghai',
	'Asia/Singapore',
	'Asia/Tokyo',
	'Asia/Seoul',
	'Australia/Brisbane',
	'Australia/Sydney',
	'Pacific/Guam',
	'Pacific/Noumea',
	'Pacific/Auckland',
	'Pacific/Fiji'
]);

// Rich text content schema (used across multiple entities)
const RichTextContentSchema = z
	.object({
		root: z.object({
			type: z.string(),
			children: z.array(
				z
					.object({
						type: z.string(),
						version: z.number()
					})
					.passthrough()
			),
			direction: z.enum(['ltr', 'rtl']).nullable(),
			format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
			indent: z.number(),
			version: z.number()
		})
	})
	.passthrough();

// Base schemas for common fields
const BaseEntitySchema = z.object({
	id: z.number(),
	updatedAt: z.string(),
	createdAt: z.string()
});

const SlugSchema = z.object({
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional()
});

const MetaSchema = z.object({
	title: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	image: z
		.union([z.number(), z.lazy(() => MediaSchema)])
		.nullable()
		.optional()
});

// Role schema
export const RoleSchema = BaseEntitySchema.extend({
	name: z.string(),
	description: z.string().nullable().optional(),
	isDefault: z.boolean().nullable().optional(),
	permissions: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
		.nullable()
		.optional()
});

// User schema
export const UserSchema = BaseEntitySchema.extend({
	roles: z.array(z.union([z.number(), RoleSchema])),
	displayName: z.string().nullable().optional(),
	showNSFW: z.boolean().nullable().optional(),
	email: z.string(),
	resetPasswordToken: z.string().nullable().optional(),
	resetPasswordExpiration: z.string().nullable().optional(),
	salt: z.string().nullable().optional(),
	hash: z.string().nullable().optional(),
	loginAttempts: z.number().nullable().optional(),
	lockUntil: z.string().nullable().optional(),
	password: z.string().nullable().optional()
});

// Media schema
export const MediaSchema = BaseEntitySchema.extend({
	alt: z.string(),
	caption: RichTextContentSchema.nullable().optional(),
	'gallery-images': z
		.object({
			docs: z
				.array(
					z.object({
						relationTo: z.literal('gallery-images').optional(),
						value: z.union([z.number(), z.lazy(() => GalleryImageSchema)])
					})
				)
				.optional(),
			hasNextPage: z.boolean().optional(),
			totalDocs: z.number().optional()
		})
		.optional(),
	relatedPosts: z
		.object({
			docs: z
				.array(
					z.object({
						relationTo: z.literal('posts').optional(),
						value: z.union([z.number(), z.lazy(() => PostSchema)])
					})
				)
				.optional(),
			hasNextPage: z.boolean().optional(),
			totalDocs: z.number().optional()
		})
		.optional(),
	exif: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
		.nullable()
		.optional(),
	blurhash: z.string().nullable().optional(),
	folder: z
		.union([z.number(), z.lazy(() => FolderInterfaceSchema)])
		.nullable()
		.optional(),
	url: z.string().nullable().optional(),
	thumbnailURL: z.string().nullable().optional(),
	filename: z.string().nullable().optional(),
	mimeType: z.string().nullable().optional(),
	filesize: z.number().nullable().optional(),
	width: z.number().nullable().optional(),
	height: z.number().nullable().optional(),
	focalX: z.number().nullable().optional(),
	focalY: z.number().nullable().optional(),
	sizes: z
		.object({
			thumbnail: z
				.object({
					url: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					height: z.number().nullable().optional(),
					mimeType: z.string().nullable().optional(),
					filesize: z.number().nullable().optional(),
					filename: z.string().nullable().optional()
				})
				.optional(),
			square: z
				.object({
					url: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					height: z.number().nullable().optional(),
					mimeType: z.string().nullable().optional(),
					filesize: z.number().nullable().optional(),
					filename: z.string().nullable().optional()
				})
				.optional(),
			small: z
				.object({
					url: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					height: z.number().nullable().optional(),
					mimeType: z.string().nullable().optional(),
					filesize: z.number().nullable().optional(),
					filename: z.string().nullable().optional()
				})
				.optional(),
			medium: z
				.object({
					url: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					height: z.number().nullable().optional(),
					mimeType: z.string().nullable().optional(),
					filesize: z.number().nullable().optional(),
					filename: z.string().nullable().optional()
				})
				.optional(),
			large: z
				.object({
					url: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					height: z.number().nullable().optional(),
					mimeType: z.string().nullable().optional(),
					filesize: z.number().nullable().optional(),
					filename: z.string().nullable().optional()
				})
				.optional(),
			xlarge: z
				.object({
					url: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					height: z.number().nullable().optional(),
					mimeType: z.string().nullable().optional(),
					filesize: z.number().nullable().optional(),
					filename: z.string().nullable().optional()
				})
				.optional(),
			og: z
				.object({
					url: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					height: z.number().nullable().optional(),
					mimeType: z.string().nullable().optional(),
					filesize: z.number().nullable().optional(),
					filename: z.string().nullable().optional()
				})
				.optional()
		})
		.optional()
});

// Gallery schemas
export const GalleryTagSchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string()
});

export const GalleryCategorySchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string()
});

export const GalleryImageSchema = BaseEntitySchema.extend({
	settings: z.object({
		slug: z.string().nullable().optional(),
		slugLock: z.boolean().nullable().optional(),
		isNsfw: z.boolean().nullable().optional(),
		'gallery-tags': z
			.array(z.union([z.number(), GalleryTagSchema]))
			.nullable()
			.optional(),
		visibility: z.enum(['ALL', 'AUTHENTICATED', 'PRIVILEGED']),
		allowedRoles: z
			.array(z.union([z.number(), RoleSchema]))
			.nullable()
			.optional(),
		allowedUsers: z
			.array(z.union([z.number(), UserSchema]))
			.nullable()
			.optional()
	}),
	selling: z
		.object({
			isSellable: z.boolean().nullable().optional()
		})
		.optional(),
	title: z.string(),
	image: z.union([z.number(), MediaSchema]),
	albums: z
		.array(z.union([z.number(), z.lazy(() => GalleryAlbumSchema)]))
		.nullable()
		.optional(),
	meta: MetaSchema.optional()
});

export const GalleryAlbumSchema = BaseEntitySchema.extend({
	settings: z.object({
		slug: z.string().nullable().optional(),
		slugLock: z.boolean().nullable().optional(),
		isNsfw: z.boolean().nullable().optional(),
		category: z.union([z.number(), GalleryCategorySchema]).nullable().optional(),
		tags: z
			.array(z.union([z.number(), GalleryTagSchema]))
			.nullable()
			.optional(),
		visibility: z.enum(['ALL', 'AUTHENTICATED', 'PRIVILEGED']),
		allowedRoles: z
			.array(z.union([z.number(), RoleSchema]))
			.nullable()
			.optional(),
		allowedUsers: z
			.array(z.union([z.number(), UserSchema]))
			.nullable()
			.optional()
	}),
	title: z.string(),
	content: RichTextContentSchema.nullable().optional(),
	images: z
		.object({
			docs: z.array(z.union([z.number(), GalleryImageSchema])).optional(),
			hasNextPage: z.boolean().optional(),
			totalDocs: z.number().optional()
		})
		.optional(),
	meta: MetaSchema.optional()
});

// Blog schemas
export const PostsCategorySchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string()
});

export const PostsTagSchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string()
});

export const PostSchema = BaseEntitySchema.merge(SlugSchema).extend({
	originalPublicationDate: z.string().nullable().optional(),
	word_count: z.number().nullable().optional(),
	category: z.union([z.number(), PostsCategorySchema]).nullable().optional(),
	tags: z
		.array(z.union([z.number(), PostsTagSchema]))
		.nullable()
		.optional(),
	relatedPosts: z
		.array(z.union([z.number(), z.lazy(() => PostSchema)]))
		.nullable()
		.optional(),
	title: z.string(),
	featuredImage: z.union([z.number(), MediaSchema]).nullable().optional(),
	content: RichTextContentSchema.nullable().optional(),
	meta: MetaSchema.optional(),
	_status: z.enum(['draft', 'published']).nullable().optional()
});

// Page schema
export const PageSchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string(),
	visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']).nullable().optional(),
	allowedRoles: z
		.array(z.union([z.number(), RoleSchema]))
		.nullable()
		.optional(),
	blocks: z
		.array(
			z.object({
				block: RichTextContentSchema.nullable().optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	meta: MetaSchema.optional(),
	_status: z.enum(['draft', 'published']).nullable().optional()
});

// Garden schema
export const GardenSchema = BaseEntitySchema.merge(SlugSchema).extend({
	name: z.string(),
	featuredImage: z.union([z.number(), MediaSchema]).nullable().optional(),
	content: RichTextContentSchema.nullable().optional(),
	title: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	image: z.union([z.number(), MediaSchema]).nullable().optional()
});

// Model kit schemas
export const ManufacturerSchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string()
});

export const ScaleSchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string()
});

export const KitSchema = BaseEntitySchema.extend({
	full_title: z.string(),
	title: z.string(),
	kit_number: z.string(),
	year_released: z.number(),
	scalemates: z.string().nullable().optional(),
	models: z
		.object({
			docs: z.array(z.union([z.number(), z.lazy(() => ModelSchema)])).optional(),
			hasNextPage: z.boolean().optional(),
			totalDocs: z.number().optional()
		})
		.optional(),
	manufacturer: z.union([z.number(), ManufacturerSchema]),
	scale: z.union([z.number(), ScaleSchema]),
	boxart: z.union([z.number(), MediaSchema]).nullable().optional()
});

export const ModelsTagSchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string()
});

export const ModelSchema = BaseEntitySchema.merge(SlugSchema).extend({
	title: z.string(),
	model_meta: z.object({
		status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
		completionDate: z.string().nullable().optional(),
		kit: z.union([z.number(), KitSchema]),
		tags: z
			.array(z.union([z.number(), ModelsTagSchema]))
			.nullable()
			.optional(),
		clockify_project_id: z.string().nullable().optional()
	}),
	buildLog: z
		.array(
			z.object({
				title: z.string(),
				content: RichTextContentSchema.nullable().optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	image: z
		.array(z.union([z.number(), MediaSchema]))
		.nullable()
		.optional(),
	meta: MetaSchema.optional()
});

// Form schemas
const FormFieldBaseSchema = z.object({
	name: z.string(),
	label: z.string().nullable().optional(),
	width: z.number().nullable().optional(),
	required: z.boolean().nullable().optional(),
	id: z.string().nullable().optional(),
	blockName: z.string().nullable().optional()
});

export const FormSchema = BaseEntitySchema.extend({
	title: z.string(),
	fields: z
		.array(
			z.discriminatedUnion('blockType', [
				FormFieldBaseSchema.extend({
					blockType: z.literal('checkbox'),
					defaultValue: z.boolean().nullable().optional()
				}),
				FormFieldBaseSchema.extend({
					blockType: z.literal('country')
				}),
				FormFieldBaseSchema.extend({
					blockType: z.literal('email')
				}),
				z.object({
					blockType: z.literal('message'),
					message: RichTextContentSchema.nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional()
				}),
				FormFieldBaseSchema.extend({
					blockType: z.literal('number'),
					defaultValue: z.number().nullable().optional()
				}),
				FormFieldBaseSchema.extend({
					blockType: z.literal('select'),
					defaultValue: z.string().nullable().optional(),
					placeholder: z.string().nullable().optional(),
					options: z
						.array(
							z.object({
								label: z.string(),
								value: z.string(),
								id: z.string().nullable().optional()
							})
						)
						.nullable()
						.optional()
				}),
				FormFieldBaseSchema.extend({
					blockType: z.literal('state')
				}),
				FormFieldBaseSchema.extend({
					blockType: z.literal('text'),
					defaultValue: z.string().nullable().optional()
				}),
				FormFieldBaseSchema.extend({
					blockType: z.literal('textarea'),
					defaultValue: z.string().nullable().optional()
				})
			])
		)
		.nullable()
		.optional(),
	submitButtonLabel: z.string().nullable().optional(),
	confirmationType: z.enum(['message', 'redirect']).nullable().optional(),
	confirmationMessage: RichTextContentSchema.nullable().optional(),
	redirect: z
		.object({
			url: z.string()
		})
		.optional(),
	emails: z
		.array(
			z.object({
				emailTo: z.string().nullable().optional(),
				cc: z.string().nullable().optional(),
				bcc: z.string().nullable().optional(),
				replyTo: z.string().nullable().optional(),
				emailFrom: z.string().nullable().optional(),
				subject: z.string(),
				message: RichTextContentSchema.nullable().optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional()
});

export const FormSubmissionSchema = BaseEntitySchema.extend({
	form: z.union([z.number(), FormSchema]),
	submissionData: z
		.array(
			z.object({
				field: z.string(),
				value: z.string(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional()
});

// Search schema
export const SearchSchema = BaseEntitySchema.extend({
	title: z.string().nullable().optional(),
	priority: z.number().nullable().optional(),
	doc: z.discriminatedUnion('relationTo', [
		z.object({
			relationTo: z.literal('posts'),
			value: z.union([z.number(), PostSchema])
		}),
		z.object({
			relationTo: z.literal('pages'),
			value: z.union([z.number(), PageSchema])
		})
	])
});

// Folder interface schema
export const FolderInterfaceSchema = BaseEntitySchema.extend({
	name: z.string(),
	folder: z
		.union([z.number(), z.lazy(() => FolderInterfaceSchema)])
		.nullable()
		.optional(),
	documentsAndFolders: z
		.object({
			docs: z
				.array(
					z.discriminatedUnion('relationTo', [
						z.object({
							relationTo: z.literal('payload-folders'),
							value: z.union([z.number(), z.lazy(() => FolderInterfaceSchema)])
						}),
						z.object({
							relationTo: z.literal('media'),
							value: z.union([z.number(), MediaSchema])
						})
					])
				)
				.optional(),
			hasNextPage: z.boolean().optional(),
			totalDocs: z.number().optional()
		})
		.optional()
});

// Payload system schemas
export const PayloadJobSchema = BaseEntitySchema.extend({
	input: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
		.nullable()
		.optional(),
	taskStatus: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
		.nullable()
		.optional(),
	completedAt: z.string().nullable().optional(),
	totalTried: z.number().nullable().optional(),
	hasError: z.boolean().nullable().optional(),
	error: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
		.nullable()
		.optional(),
	log: z
		.array(
			z.object({
				executedAt: z.string(),
				completedAt: z.string(),
				taskSlug: z.enum(['inline', 'schedulePublish']),
				taskID: z.string(),
				input: z
					.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
					.nullable()
					.optional(),
				output: z
					.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
					.nullable()
					.optional(),
				state: z.enum(['failed', 'succeeded']),
				error: z
					.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
					.nullable()
					.optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	taskSlug: z.enum(['inline', 'schedulePublish']).nullable().optional(),
	queue: z.string().nullable().optional(),
	waitUntil: z.string().nullable().optional(),
	processing: z.boolean().nullable().optional()
});

// Global schemas
export const SiteMetaSchema = z.object({
	id: z.number(),
	siteMeta: z
		.array(
			z.object({
				title: z.string(),
				description: z.string(),
				path: z.string(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	updatedAt: z.string().nullable().optional(),
	createdAt: z.string().nullable().optional()
});

export const SiteNavigationSchema = z.object({
	id: z.number(),
	navItems: z
		.array(
			z.object({
				title: z.string(),
				link: z.string(),
				childNodes: z
					.array(
						z.object({
							title: z.string(),
							link: z.string(),
							order: z.number(),
							icon: z.union([z.number(), MediaSchema]).nullable().optional(),
							visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']),
							allowedRoles: z
								.array(z.union([z.number(), RoleSchema]))
								.nullable()
								.optional(),
							allowedUsers: z
								.array(z.union([z.number(), UserSchema]))
								.nullable()
								.optional(),
							id: z.string().nullable().optional()
						})
					)
					.nullable()
					.optional(),
				order: z.number(),
				icon: z.union([z.number(), MediaSchema]).nullable().optional(),
				visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']),
				allowedRoles: z
					.array(z.union([z.number(), RoleSchema]))
					.nullable()
					.optional(),
				allowedUsers: z
					.array(z.union([z.number(), UserSchema]))
					.nullable()
					.optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	updatedAt: z.string().nullable().optional(),
	createdAt: z.string().nullable().optional()
});

// Export all schemas for easy use
export const PayloadSchemas = {
	SupportedTimezones: SupportedTimezonesSchema,
	Role: RoleSchema,
	User: UserSchema,
	Media: MediaSchema,
	GalleryTag: GalleryTagSchema,
	GalleryCategory: GalleryCategorySchema,
	GalleryImage: GalleryImageSchema,
	GalleryAlbum: GalleryAlbumSchema,
	PostsCategory: PostsCategorySchema,
	PostsTag: PostsTagSchema,
	Post: PostSchema,
	Page: PageSchema,
	Garden: GardenSchema,
	Manufacturer: ManufacturerSchema,
	Scale: ScaleSchema,
	Kit: KitSchema,
	ModelsTag: ModelsTagSchema,
	Model: ModelSchema,
	Form: FormSchema,
	FormSubmission: FormSubmissionSchema,
	Search: SearchSchema,
	FolderInterface: FolderInterfaceSchema,
	PayloadJob: PayloadJobSchema,
	SiteMeta: SiteMetaSchema,
	SiteNavigation: SiteNavigationSchema
};

// Type inference helpers
export type SupportedTimezones = z.infer<typeof SupportedTimezonesSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type User = z.infer<typeof UserSchema>;
export type Media = z.infer<typeof MediaSchema>;
export type GalleryTag = z.infer<typeof GalleryTagSchema>;
export type GalleryCategory = z.infer<typeof GalleryCategorySchema>;
export type GalleryImage = z.infer<typeof GalleryImageSchema>;
export type GalleryAlbum = z.infer<typeof GalleryAlbumSchema>;
export type PostsCategory = z.infer<typeof PostsCategorySchema>;
export type PostsTag = z.infer<typeof PostsTagSchema>;
export type Post = z.infer<typeof PostSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Garden = z.infer<typeof GardenSchema>;
export type Manufacturer = z.infer<typeof ManufacturerSchema>;
export type Scale = z.infer<typeof ScaleSchema>;
export type Kit = z.infer<typeof KitSchema>;
export type ModelsTag = z.infer<typeof ModelsTagSchema>;
export type Model = z.infer<typeof ModelSchema>;
export type Form = z.infer<typeof FormSchema>;
export type FormSubmission = z.infer<typeof FormSubmissionSchema>;
export type Search = z.infer<typeof SearchSchema>;
export type FolderInterface = z.infer<typeof FolderInterfaceSchema>;
export type PayloadJob = z.infer<typeof PayloadJobSchema>;
export type SiteMeta = z.infer<typeof SiteMetaSchema>;
export type SiteNavigation = z.infer<typeof SiteNavigationSchema>;
