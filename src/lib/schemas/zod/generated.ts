import { z } from 'zod';

/**
 * Zod schema for SupportedTimezones
 * Represents all supported timezones in IANA format
 */
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

/**
 * Zod schema for UserAuthOperations
 * Defines authentication operations for users
 */
export const UserAuthOperationsSchema = z.object({
	forgotPassword: z.object({
		email: z.string().email(),
		password: z.string()
	}),
	login: z.object({
		email: z.string().email(),
		password: z.string()
	}),
	registerFirstUser: z.object({
		email: z.string().email(),
		password: z.string()
	}),
	unlock: z.object({
		email: z.string().email(),
		password: z.string()
	})
});

/**
 * Zod schema for GalleryTag
 * Represents tags used for more focused classification of gallery images
 */
export const GalleryTagSchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for GalleryCategory
 * Represents categories used as primary method of filtering galleries
 */
export const GalleryCategorySchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Role
 * Represents user roles and permissions
 */
export const RoleSchema = z.object({
	id: z.number(),
	name: z.string(),
	description: z.string().nullable().optional(),
	isDefault: z.boolean().nullable().optional(),
	permissions: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
		.nullable()
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for User
 * Represents user accounts
 */
export const UserSchema = z.object({
	id: z.number(),
	roles: z.array(z.union([z.number(), z.lazy(() => RoleSchema)])),
	displayName: z.string().nullable().optional(),
	showNSFW: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string(),
	email: z.string().email(),
	resetPasswordToken: z.string().nullable().optional(),
	resetPasswordExpiration: z.string().nullable().optional(),
	salt: z.string().nullable().optional(),
	hash: z.string().nullable().optional(),
	loginAttempts: z.number().nullable().optional(),
	lockUntil: z.string().nullable().optional(),
	sessions: z
		.array(
			z.object({
				id: z.string(),
				createdAt: z.string().nullable().optional(),
				expiresAt: z.string()
			})
		)
		.nullable()
		.optional(),
	password: z.string().nullable().optional()
});

/**
 * Zod schema for Media
 * Represents media items, images and otherwise
 */
export const MediaSchema = z.object({
	id: z.number(),
	alt: z.string(),
	caption: z
		.object({
			root: z.object({
				type: z.string(),
				children: z.array(
					z
						.object({
							type: z.string(),
							version: z.number()
						})
						.catchall(z.unknown())
				),
				direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
				format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
				indent: z.number(),
				version: z.number()
			})
		})
		.catchall(z.unknown())
		.nullable()
		.optional(),
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
		.union([z.union([z.number(), z.null()]), z.lazy(() => FolderInterfaceSchema)])
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string(),
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

/**
 * Zod schema for PostsTag
 * Represents blog tags used for more focused classification of blog posts
 */
export const PostsTagSchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for PostsCategory
 * Represents blog categories used for general classification of blog posts
 */
export const PostsCategorySchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Post
 * Represents blog posts
 */
export const PostSchema = z.object({
	id: z.number(),
	originalPublicationDate: z.string().nullable().optional(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	word_count: z.number().nullable().optional(),
	category: z
		.union([z.union([z.number(), z.null()]), z.lazy(() => PostsCategorySchema)])
		.optional(),
	tags: z.array(z.union([z.number(), z.lazy(() => PostsTagSchema)])).optional(),
	relatedPosts: z.array(z.union([z.number(), z.lazy(() => PostSchema)])).optional(),
	title: z.string(),
	featuredImage: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional(),
	content: z
		.object({
			root: z.object({
				type: z.string(),
				children: z.array(
					z
						.object({
							type: z.string(),
							version: z.number()
						})
						.catchall(z.unknown())
				),
				direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
				format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
				indent: z.number(),
				version: z.number()
			})
		})
		.catchall(z.unknown())
		.nullable()
		.optional(),
	meta: z
		.object({
			title: z.string().nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional()
		})
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string(),
	_status: z.enum(['draft', 'published']).nullable().optional()
});

/**
 * Zod schema for GalleryImage
 * Represents gallery images
 */
export const GalleryImageSchema = z.object({
	id: z.number(),
	settings: z.object({
		slug: z.string().nullable().optional(),
		slugLock: z.boolean().nullable().optional(),
		isNsfw: z.boolean().nullable().optional(),
		'gallery-tags': z
			.array(z.union([z.number(), z.lazy(() => GalleryTagSchema)]))
			.nullable()
			.optional(),
		visibility: z.enum(['ALL', 'AUTHENTICATED', 'PRIVILEGED']),
		allowedRoles: z
			.array(z.union([z.number(), z.lazy(() => RoleSchema)]))
			.nullable()
			.optional(),
		allowedUsers: z
			.array(z.union([z.number(), z.lazy(() => UserSchema)]))
			.nullable()
			.optional()
	}),
	selling: z
		.object({
			isSellable: z.boolean().nullable().optional()
		})
		.optional(),
	tracking: z
		.object({
			views: z.number().nullable().optional(),
			downloads: z.number().nullable().optional(),
			likes: z.number().nullable().optional(),
			dislikes: z.number().nullable().optional(),
			comments: z.number().nullable().optional(),
			shares: z.number().nullable().optional()
		})
		.optional(),
	title: z.string(),
	image: z.union([z.number(), z.lazy(() => MediaSchema)]),
	content: z
		.object({
			root: z.object({
				type: z.string(),
				children: z.array(
					z
						.object({
							type: z.string(),
							version: z.number()
						})
						.catchall(z.unknown())
				),
				direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
				format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
				indent: z.number(),
				version: z.number()
			})
		})
		.catchall(z.unknown())
		.nullable()
		.optional(),
	albums: z
		.array(z.union([z.number(), z.lazy(() => GalleryAlbumSchema)]))
		.nullable()
		.optional(),
	meta: z
		.object({
			title: z.string().nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional()
		})
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for GalleryAlbum
 * Represents listing of all photo albums
 */
export const GalleryAlbumSchema = z.object({
	id: z.number(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	settings: z.object({
		isNsfw: z.boolean().nullable().optional(),
		category: z
			.union([z.union([z.number(), z.null()]), z.lazy(() => GalleryCategorySchema)])
			.optional(),
		tags: z
			.array(z.union([z.number(), z.lazy(() => GalleryTagSchema)]))
			.nullable()
			.optional(),
		visibility: z.enum(['ALL', 'AUTHENTICATED', 'PRIVILEGED']),
		allowedRoles: z
			.array(z.union([z.number(), z.lazy(() => RoleSchema)]))
			.nullable()
			.optional(),
		allowedUsers: z
			.array(z.union([z.number(), z.lazy(() => UserSchema)]))
			.nullable()
			.optional()
	}),
	tracking: z
		.object({
			views: z.number().nullable().optional(),
			downloads: z.number().nullable().optional(),
			likes: z.number().nullable().optional(),
			dislikes: z.number().nullable().optional(),
			comments: z.number().nullable().optional(),
			shares: z.number().nullable().optional(),
			totalImages: z.number().nullable().optional()
		})
		.optional(),
	title: z.string(),
	content: z
		.object({
			root: z.object({
				type: z.string(),
				children: z.array(
					z
						.object({
							type: z.string(),
							version: z.number()
						})
						.catchall(z.unknown())
				),
				direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
				format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
				indent: z.number(),
				version: z.number()
			})
		})
		.catchall(z.unknown())
		.nullable()
		.optional(),
	images: z
		.object({
			docs: z.array(z.union([z.number(), z.lazy(() => GalleryImageSchema)])).optional(),
			hasNextPage: z.boolean().optional(),
			totalDocs: z.number().optional()
		})
		.optional(),
	meta: z
		.object({
			title: z.string().nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional()
		})
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for MapMarker
 * Represents map markers used for plotting points of interest
 */
export const MapMarkerSchema = z.object({
	id: z.number(),
	title: z.string(),
	location: z.tuple([z.number(), z.number()]),
	visits: z.number().nullable().optional(),
	rating: z.number().nullable().optional(),
	links: z
		.array(
			z.object({
				title: z.string(),
				album: z
					.object({
						relationTo: z.literal('gallery-albums'),
						value: z.union([z.number(), z.lazy(() => GalleryAlbumSchema)])
					})
					.nullable()
					.optional(),
				url: z.string().nullable().optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for FolderInterface
 * Represents folder structure
 */
export const FolderInterfaceSchema = z.object({
	id: z.number(),
	name: z.string(),
	folder: z
		.union([z.union([z.number(), z.null()]), z.lazy(() => FolderInterfaceSchema)])
		.optional(),
	documentsAndFolders: z
		.object({
			docs: z
				.array(
					z.union([
						z.object({
							relationTo: z.literal('payload-folders').optional(),
							value: z.union([z.number(), z.lazy(() => FolderInterfaceSchema)])
						}),
						z.object({
							relationTo: z.literal('media').optional(),
							value: z.union([z.number(), z.lazy(() => MediaSchema)])
						})
					])
				)
				.optional(),
			hasNextPage: z.boolean().optional(),
			totalDocs: z.number().optional()
		})
		.optional(),
	folderType: z.array(z.literal('media')).nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Page
 * Represents singular dynamic pages of the front end
 */
export const PageSchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']).nullable().optional(),
	allowedRoles: z
		.array(z.union([z.number(), z.lazy(() => RoleSchema)]))
		.nullable()
		.optional(),
	blocks: z
		.array(
			z.object({
				block: z
					.object({
						root: z.object({
							type: z.string(),
							children: z.array(
								z
									.object({
										type: z.string(),
										version: z.number()
									})
									.catchall(z.unknown())
							),
							direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
							format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
							indent: z.number(),
							version: z.number()
						})
					})
					.catchall(z.unknown())
					.nullable()
					.optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	meta: z
		.object({
			title: z.string().nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional()
		})
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string(),
	_status: z.enum(['draft', 'published']).nullable().optional()
});

/**
 * Zod schema for Garden
 * Represents other things that don't have a specific home
 */
export const GardenSchema = z.object({
	id: z.number(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	name: z.string(),
	featuredImage: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional(),
	content: z
		.object({
			root: z.object({
				type: z.string(),
				children: z.array(
					z
						.object({
							type: z.string(),
							version: z.number()
						})
						.catchall(z.unknown())
				),
				direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
				format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
				indent: z.number(),
				version: z.number()
			})
		})
		.catchall(z.unknown())
		.nullable()
		.optional(),
	meta: z
		.object({
			title: z.string().nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional()
		})
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Scale
 * Represents model kit scales
 */
export const ScaleSchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Manufacturer
 * Represents model kit manufacturers
 */
export const ManufacturerSchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for ModelsTag
 * Represents tags used for more focused classification of models
 */
export const ModelsTagSchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Model
 * Represents a built model, not to be confused with a kit
 */
export const ModelSchema = z.object({
	id: z.number(),
	title: z.string(),
	slug: z.string().nullable().optional(),
	slugLock: z.boolean().nullable().optional(),
	clockify_project: z.string().nullable().optional(),
	model_meta: z.object({
		featuredImage: z.union([z.number(), z.lazy(() => MediaSchema)]),
		status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
		completionDate: z.string().nullable().optional(),
		kit: z.union([z.number(), z.lazy(() => KitSchema)]),
		tags: z
			.array(z.union([z.number(), z.lazy(() => ModelsTagSchema)]))
			.nullable()
			.optional(),
		videos: z
			.array(
				z.object({
					title: z.string(),
					url: z.string().nullable().optional(),
					id: z.string().nullable().optional()
				})
			)
			.nullable()
			.optional()
	}),
	relatedResources: z
		.object({
			relatedPosts: z
				.array(z.union([z.number(), z.lazy(() => PostSchema)]))
				.nullable()
				.optional(),
			relatedModels: z
				.array(z.union([z.number(), z.lazy(() => ModelSchema)]))
				.nullable()
				.optional()
		})
		.optional(),
	buildLog: z
		.array(
			z.object({
				title: z.string(),
				content: z
					.object({
						root: z.object({
							type: z.string(),
							children: z.array(
								z
									.object({
										type: z.string(),
										version: z.number()
									})
									.catchall(z.unknown())
							),
							direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
							format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
							indent: z.number(),
							version: z.number()
						})
					})
					.catchall(z.unknown())
					.nullable()
					.optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	image: z
		.array(z.union([z.number(), z.lazy(() => MediaSchema)]))
		.nullable()
		.optional(),
	meta: z
		.object({
			title: z.string().nullable().optional(),
			description: z.string().nullable().optional(),
			image: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional()
		})
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Kit
 * Represents model kits
 */
export const KitSchema = z.object({
	id: z.number(),
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
	manufacturer: z.union([z.number(), z.lazy(() => ManufacturerSchema)]),
	scale: z.union([z.number(), z.lazy(() => ScaleSchema)]),
	boxart: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Form
 * Represents form configuration
 */
export const FormSchema = z.object({
	id: z.number(),
	title: z.string(),
	fields: z
		.array(
			z.union([
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					required: z.boolean().nullable().optional(),
					defaultValue: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('checkbox')
				}),
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					required: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('country')
				}),
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					required: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('email')
				}),
				z.object({
					message: z
						.object({
							root: z.object({
								type: z.string(),
								children: z.array(
									z
										.object({
											type: z.string(),
											version: z.number()
										})
										.catchall(z.unknown())
								),
								direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
								format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
								indent: z.number(),
								version: z.number()
							})
						})
						.catchall(z.unknown())
						.nullable()
						.optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('message')
				}),
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					defaultValue: z.number().nullable().optional(),
					required: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('number')
				}),
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
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
						.optional(),
					required: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('select')
				}),
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					required: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('state')
				}),
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					defaultValue: z.string().nullable().optional(),
					required: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('text')
				}),
				z.object({
					name: z.string(),
					label: z.string().nullable().optional(),
					width: z.number().nullable().optional(),
					defaultValue: z.string().nullable().optional(),
					required: z.boolean().nullable().optional(),
					id: z.string().nullable().optional(),
					blockName: z.string().nullable().optional(),
					blockType: z.literal('textarea')
				})
			])
		)
		.nullable()
		.optional(),
	submitButtonLabel: z.string().nullable().optional(),
	confirmationType: z.enum(['message', 'redirect']).nullable().optional(),
	confirmationMessage: z
		.object({
			root: z.object({
				type: z.string(),
				children: z.array(
					z
						.object({
							type: z.string(),
							version: z.number()
						})
						.catchall(z.unknown())
				),
				direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
				format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
				indent: z.number(),
				version: z.number()
			})
		})
		.catchall(z.unknown())
		.nullable()
		.optional(),
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
				message: z
					.object({
						root: z.object({
							type: z.string(),
							children: z.array(
								z
									.object({
										type: z.string(),
										version: z.number()
									})
									.catchall(z.unknown())
							),
							direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
							format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
							indent: z.number(),
							version: z.number()
						})
					})
					.catchall(z.unknown())
					.nullable()
					.optional(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for FormSubmission
 * Represents form submission data
 */
export const FormSubmissionSchema = z.object({
	id: z.number(),
	form: z.union([z.number(), z.lazy(() => FormSchema)]),
	submissionData: z
		.array(
			z.object({
				field: z.string(),
				value: z.string(),
				id: z.string().nullable().optional()
			})
		)
		.nullable()
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for Search
 * Represents automatically created search results
 */
export const SearchSchema = z.object({
	id: z.number(),
	title: z.string().nullable().optional(),
	priority: z.number().nullable().optional(),
	doc: z.union([
		z.object({
			relationTo: z.literal('posts'),
			value: z.union([z.number(), z.lazy(() => PostSchema)])
		}),
		z.object({
			relationTo: z.literal('pages'),
			value: z.union([z.number(), z.lazy(() => PageSchema)])
		}),
		z.object({
			relationTo: z.literal('models'),
			value: z.union([z.number(), z.lazy(() => ModelSchema)])
		}),
		z.object({
			relationTo: z.literal('gardens'),
			value: z.union([z.number(), z.lazy(() => GardenSchema)])
		})
	]),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for PayloadJob
 * Represents background job configuration
 */
export const PayloadJobSchema = z.object({
	id: z.number(),
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
	processing: z.boolean().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for PayloadLockedDocument
 * Represents document lock information
 */
export const PayloadLockedDocumentSchema = z.object({
	id: z.number(),
	document: z
		.union([
			z
				.object({
					relationTo: z.literal('map-markers'),
					value: z.union([z.number(), z.lazy(() => MapMarkerSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('users'),
					value: z.union([z.number(), z.lazy(() => UserSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('media'),
					value: z.union([z.number(), z.lazy(() => MediaSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('posts'),
					value: z.union([z.number(), z.lazy(() => PostSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('posts-categories'),
					value: z.union([z.number(), z.lazy(() => PostsCategorySchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('posts-tags'),
					value: z.union([z.number(), z.lazy(() => PostsTagSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('pages'),
					value: z.union([z.number(), z.lazy(() => PageSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('roles'),
					value: z.union([z.number(), z.lazy(() => RoleSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('gallery-albums'),
					value: z.union([z.number(), z.lazy(() => GalleryAlbumSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('gallery-images'),
					value: z.union([z.number(), z.lazy(() => GalleryImageSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('gallery-tags'),
					value: z.union([z.number(), z.lazy(() => GalleryTagSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('gallery-categories'),
					value: z.union([z.number(), z.lazy(() => GalleryCategorySchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('gardens'),
					value: z.union([z.number(), z.lazy(() => GardenSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('kits'),
					value: z.union([z.number(), z.lazy(() => KitSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('scales'),
					value: z.union([z.number(), z.lazy(() => ScaleSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('manufacturers'),
					value: z.union([z.number(), z.lazy(() => ManufacturerSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('models-tags'),
					value: z.union([z.number(), z.lazy(() => ModelsTagSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('models'),
					value: z.union([z.number(), z.lazy(() => ModelSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('forms'),
					value: z.union([z.number(), z.lazy(() => FormSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('form-submissions'),
					value: z.union([z.number(), z.lazy(() => FormSubmissionSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('search'),
					value: z.union([z.number(), z.lazy(() => SearchSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('payload-jobs'),
					value: z.union([z.number(), z.lazy(() => PayloadJobSchema)])
				})
				.nullable(),
			z
				.object({
					relationTo: z.literal('payload-folders'),
					value: z.union([z.number(), z.lazy(() => FolderInterfaceSchema)])
				})
				.nullable()
		])
		.optional(),
	globalSlug: z.string().nullable().optional(),
	user: z.object({
		relationTo: z.literal('users'),
		value: z.union([z.number(), z.lazy(() => UserSchema)])
	}),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for PayloadPreference
 * Represents user preferences
 */
export const PayloadPreferenceSchema = z.object({
	id: z.number(),
	user: z.object({
		relationTo: z.literal('users'),
		value: z.union([z.number(), z.lazy(() => UserSchema)])
	}),
	key: z.string().nullable().optional(),
	value: z
		.union([z.record(z.unknown()), z.array(z.unknown()), z.string(), z.number(), z.boolean()])
		.nullable()
		.optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for PayloadMigration
 * Represents database migration records
 */
export const PayloadMigrationSchema = z.object({
	id: z.number(),
	name: z.string().nullable().optional(),
	batch: z.number().nullable().optional(),
	updatedAt: z.string(),
	createdAt: z.string()
});

/**
 * Zod schema for SiteMeta
 * Represents site metadata
 */
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

/**
 * Zod schema for SiteNavigation
 * Represents site navigation structure
 */
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
							icon: z
								.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)])
								.optional(),
							visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']),
							allowedRoles: z
								.array(z.union([z.number(), z.lazy(() => RoleSchema)]))
								.nullable()
								.optional(),
							allowedUsers: z
								.array(z.union([z.number(), z.lazy(() => UserSchema)]))
								.nullable()
								.optional(),
							id: z.string().nullable().optional()
						})
					)
					.nullable()
					.optional(),
				order: z.number(),
				icon: z.union([z.union([z.number(), z.null()]), z.lazy(() => MediaSchema)]).optional(),
				visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']),
				allowedRoles: z
					.array(z.union([z.number(), z.lazy(() => RoleSchema)]))
					.nullable()
					.optional(),
				allowedUsers: z
					.array(z.union([z.number(), z.lazy(() => UserSchema)]))
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

/**
 * Zod schema for TaskSchedulePublish
 * Represents schedule publish task configuration
 */
export const TaskSchedulePublishSchema = z.object({
	input: z.object({
		type: z.enum(['publish', 'unpublish']).nullable().optional(),
		locale: z.string().nullable().optional(),
		doc: z
			.union([
				z
					.object({
						relationTo: z.literal('posts'),
						value: z.union([z.number(), z.lazy(() => PostSchema)])
					})
					.nullable(),
				z
					.object({
						relationTo: z.literal('pages'),
						value: z.union([z.number(), z.lazy(() => PageSchema)])
					})
					.nullable()
			])
			.optional(),
		global: z.string().nullable().optional(),
		user: z.union([z.union([z.number(), z.null()]), z.lazy(() => UserSchema)]).optional()
	}),
	output: z.unknown().optional()
});

/**
 * Zod schema for Auth
 * Represents authentication configuration
 */
export const AuthSchema = z.record(z.unknown());

/**
 * Zod schema for Config
 * Represents the main configuration
 */
export const ConfigSchema = z.object({
	auth: z.object({
		users: z.lazy(() => UserAuthOperationsSchema)
	}),
	blocks: z.object({}),
	collections: z.object({
		'map-markers': z.lazy(() => MapMarkerSchema),
		users: z.lazy(() => UserSchema),
		media: z.lazy(() => MediaSchema),
		posts: z.lazy(() => PostSchema),
		'posts-categories': z.lazy(() => PostsCategorySchema),
		'posts-tags': z.lazy(() => PostsTagSchema),
		pages: z.lazy(() => PageSchema),
		roles: z.lazy(() => RoleSchema),
		'gallery-albums': z.lazy(() => GalleryAlbumSchema),
		'gallery-images': z.lazy(() => GalleryImageSchema),
		'gallery-tags': z.lazy(() => GalleryTagSchema),
		'gallery-categories': z.lazy(() => GalleryCategorySchema),
		gardens: z.lazy(() => GardenSchema),
		kits: z.lazy(() => KitSchema),
		scales: z.lazy(() => ScaleSchema),
		manufacturers: z.lazy(() => ManufacturerSchema),
		'models-tags': z.lazy(() => ModelsTagSchema),
		models: z.lazy(() => ModelSchema),
		forms: z.lazy(() => FormSchema),
		'form-submissions': z.lazy(() => FormSubmissionSchema),
		search: z.lazy(() => SearchSchema),
		'payload-jobs': z.lazy(() => PayloadJobSchema),
		'payload-folders': z.lazy(() => FolderInterfaceSchema),
		'payload-locked-documents': z.lazy(() => PayloadLockedDocumentSchema),
		'payload-preferences': z.lazy(() => PayloadPreferenceSchema),
		'payload-migrations': z.lazy(() => PayloadMigrationSchema)
	}),
	collectionsJoins: z.object({
		media: z.object({
			'gallery-images': z.literal('gallery-images'),
			relatedPosts: z.literal('posts')
		}),
		'gallery-albums': z.object({
			images: z.literal('gallery-images')
		}),
		kits: z.object({
			models: z.literal('models')
		}),
		'payload-folders': z.object({
			documentsAndFolders: z.union([z.literal('payload-folders'), z.literal('media')])
		})
	}),
	collectionsSelect: z.object({
		'map-markers': z.any(),
		users: z.any(),
		media: z.any(),
		posts: z.any(),
		'posts-categories': z.any(),
		'posts-tags': z.any(),
		pages: z.any(),
		roles: z.any(),
		'gallery-albums': z.any(),
		'gallery-images': z.any(),
		'gallery-tags': z.any(),
		'gallery-categories': z.any(),
		gardens: z.any(),
		kits: z.any(),
		scales: z.any(),
		manufacturers: z.any(),
		'models-tags': z.any(),
		models: z.any(),
		forms: z.any(),
		'form-submissions': z.any(),
		search: z.any(),
		'payload-jobs': z.any(),
		'payload-folders': z.any(),
		'payload-locked-documents': z.any(),
		'payload-preferences': z.any(),
		'payload-migrations': z.any()
	}),
	db: z.object({
		defaultIDType: z.number()
	}),
	globals: z.object({
		'site-meta': z.lazy(() => SiteMetaSchema),
		'site-navigation': z.lazy(() => SiteNavigationSchema)
	}),
	globalsSelect: z.object({
		'site-meta': z.any(),
		'site-navigation': z.any()
	}),
	locale: z.null(),
	user: z.object({
		...UserSchema.shape,
		collection: z.literal('users')
	}),
	jobs: z.object({
		tasks: z.object({
			schedulePublish: z.lazy(() => TaskSchedulePublishSchema),
			inline: z.object({
				input: z.unknown(),
				output: z.unknown()
			})
		}),
		workflows: z.unknown()
	})
});
