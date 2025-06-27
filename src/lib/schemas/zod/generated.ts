import { z } from 'zod';

/**
 * Zod schema for supported timezones in IANA format
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
 * Zod schema for user authentication operations
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
 * Zod schema for gallery tags
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
 * Zod schema for gallery categories
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
 * Zod schema for user roles
 */
export const RoleSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable().optional(),
  isDefault: z.boolean().nullable().optional(),
  permissions: z.union([
    z.record(z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean()
  ]).nullable().optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for user accounts
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
  password: z.string().nullable().optional()
});

/**
 * Zod schema for rich text content
 */
export const RichTextSchema = z.object({
  root: z.object({
    type: z.string(),
    children: z.array(z.object({
      type: z.string(),
      version: z.number()
    }).catchall(z.unknown())),
    direction: z.union([z.enum(['ltr', 'rtl']), z.null()]),
    format: z.enum(['left', 'start', 'center', 'right', 'end', 'justify', '']),
    indent: z.number(),
    version: z.number()
  })
}).catchall(z.unknown());

/**
 * Zod schema for media
 */
export const MediaSchema = z.lazy(() => z.object({
  id: z.number(),
  alt: z.string(),
  caption: RichTextSchema.nullable().optional(),
  'gallery-images': z.object({
    docs: z.array(z.object({
      relationTo: z.literal('gallery-images'),
      value: z.union([z.number(), GalleryImageSchema])
    })).optional(),
    hasNextPage: z.boolean().optional(),
    totalDocs: z.number().optional()
  }).optional(),
  relatedPosts: z.object({
    docs: z.array(z.object({
      relationTo: z.literal('posts'),
      value: z.union([z.number(), PostSchema])
    })).optional(),
    hasNextPage: z.boolean().optional(),
    totalDocs: z.number().optional()
  }).optional(),
  exif: z.union([
    z.record(z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean()
  ]).nullable().optional(),
  blurhash: z.string().nullable().optional(),
  folder: z.union([
    z.union([z.number(), z.null()]),
    z.lazy(() => FolderInterfaceSchema)
  ]).optional(),
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
  sizes: z.object({
    thumbnail: z.object({
      url: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      filesize: z.number().nullable().optional(),
      filename: z.string().nullable().optional()
    }).optional(),
    square: z.object({
      url: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      filesize: z.number().nullable().optional(),
      filename: z.string().nullable().optional()
    }).optional(),
    small: z.object({
      url: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      filesize: z.number().nullable().optional(),
      filename: z.string().nullable().optional()
    }).optional(),
    medium: z.object({
      url: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      filesize: z.number().nullable().optional(),
      filename: z.string().nullable().optional()
    }).optional(),
    large: z.object({
      url: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      filesize: z.number().nullable().optional(),
      filename: z.string().nullable().optional()
    }).optional(),
    xlarge: z.object({
      url: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      filesize: z.number().nullable().optional(),
      filename: z.string().nullable().optional()
    }).optional(),
    og: z.object({
      url: z.string().nullable().optional(),
      width: z.number().nullable().optional(),
      height: z.number().nullable().optional(),
      mimeType: z.string().nullable().optional(),
      filesize: z.number().nullable().optional(),
      filename: z.string().nullable().optional()
    }).optional()
  }).optional()
}));

/**
 * Zod schema for gallery images
 */
export const GalleryImageSchema = z.object({
  id: z.number(),
  settings: z.object({
    slug: z.string().nullable().optional(),
    slugLock: z.boolean().nullable().optional(),
    isNsfw: z.boolean().nullable().optional(),
    'gallery-tags': z.array(z.union([z.number(), GalleryTagSchema])).nullable().optional(),
    visibility: z.enum(['ALL', 'AUTHENTICATED', 'PRIVILEGED']),
    allowedRoles: z.array(z.union([z.number(), RoleSchema])).nullable().optional(),
    allowedUsers: z.array(z.union([z.number(), UserSchema])).nullable().optional()
  }),
  selling: z.object({
    isSellable: z.boolean().nullable().optional()
  }).optional(),
  tracking: z.object({
    views: z.number().nullable().optional(),
    downloads: z.number().nullable().optional(),
    likes: z.number().nullable().optional(),
    dislikes: z.number().nullable().optional(),
    comments: z.number().nullable().optional(),
    shares: z.number().nullable().optional()
  }).optional(),
  title: z.string(),
  image: z.union([z.number(), MediaSchema]),
  content: RichTextSchema.nullable().optional(),
  albums: z.array(z.union([z.number(), z.lazy(() => GalleryAlbumSchema)])).nullable().optional(),
  meta: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional()
  }).optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for gallery albums
 */
export const GalleryAlbumSchema = z.object({
  id: z.number(),
  slug: z.string().nullable().optional(),
  slugLock: z.boolean().nullable().optional(),
  settings: z.object({
    isNsfw: z.boolean().nullable().optional(),
    category: z.union([z.union([z.number(), z.null()]), GalleryCategorySchema]).optional(),
    tags: z.array(z.union([z.number(), GalleryTagSchema])).nullable().optional(),
    visibility: z.enum(['ALL', 'AUTHENTICATED', 'PRIVILEGED']),
    allowedRoles: z.array(z.union([z.number(), RoleSchema])).nullable().optional(),
    allowedUsers: z.array(z.union([z.number(), UserSchema])).nullable().optional()
  }),
  tracking: z.object({
    views: z.number().nullable().optional(),
    downloads: z.number().nullable().optional(),
    likes: z.number().nullable().optional(),
    dislikes: z.number().nullable().optional(),
    comments: z.number().nullable().optional(),
    shares: z.number().nullable().optional(),
    totalImages: z.number().nullable().optional()
  }).optional(),
  title: z.string(),
  content: RichTextSchema.nullable().optional(),
  images: z.object({
    docs: z.array(z.union([z.number(), GalleryImageSchema])).optional(),
    hasNextPage: z.boolean().optional(),
    totalDocs: z.number().optional()
  }).optional(),
  meta: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional()
  }).optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for posts tags
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
 * Zod schema for posts categories
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
 * Zod schema for blog posts
 */
export const PostSchema = z.lazy(() => z.object({
  id: z.number(),
  originalPublicationDate: z.string().nullable().optional(),
  slug: z.string().nullable().optional(),
  slugLock: z.boolean().nullable().optional(),
  word_count: z.number().nullable().optional(),
  category: z.union([z.union([z.number(), z.null()]), PostsCategorySchema]).optional(),
  tags: z.array(z.union([z.number(), PostsTagSchema])).nullable().optional(),
  relatedPosts: z.array(z.union([z.number(), PostSchema])).nullable().optional(),
  title: z.string(),
  featuredImage: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional(),
  content: RichTextSchema.nullable().optional(),
  meta: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional()
  }).optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
  _status: z.enum(['draft', 'published']).nullable().optional()
}));

/**
 * Zod schema for folders
 */
export const FolderInterfaceSchema = z.lazy(() => z.object({
  id: z.number(),
  name: z.string(),
  folder: z.union([z.union([z.number(), z.null()]), FolderInterfaceSchema]).optional(),
  documentsAndFolders: z.object({
    docs: z.array(z.union([
      z.object({
        relationTo: z.literal('payload-folders'),
        value: z.union([z.number(), FolderInterfaceSchema])
      }),
      z.object({
        relationTo: z.literal('media'),
        value: z.union([z.number(), MediaSchema])
      })
    ])).optional(),
    hasNextPage: z.boolean().optional(),
    totalDocs: z.number().optional()
  }).optional(),
  updatedAt: z.string(),
  createdAt: z.string()
}));

/**
 * Zod schema for pages
 */
export const PageSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string().nullable().optional(),
  slugLock: z.boolean().nullable().optional(),
  visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']).nullable().optional(),
  allowedRoles: z.array(z.union([z.number(), RoleSchema])).nullable().optional(),
  blocks: z.array(z.object({
    block: RichTextSchema.nullable().optional(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  meta: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional()
  }).optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
  _status: z.enum(['draft', 'published']).nullable().optional()
});

/**
 * Zod schema for gardens
 */
export const GardenSchema = z.object({
  id: z.number(),
  slug: z.string().nullable().optional(),
  slugLock: z.boolean().nullable().optional(),
  name: z.string(),
  featuredImage: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional(),
  content: RichTextSchema.nullable().optional(),
  meta: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional()
  }).optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for model scales
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
 * Zod schema for model manufacturers
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
 * Zod schema for models tags
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
 * Zod schema for models
 */
export const ModelSchema = z.lazy(() => z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string().nullable().optional(),
  slugLock: z.boolean().nullable().optional(),
  clockify_project: z.string().nullable().optional(),
  model_meta: z.object({
    featuredImage: z.union([z.number(), MediaSchema]),
    status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']),
    completionDate: z.string().nullable().optional(),
    kit: z.union([z.number(), z.lazy(() => KitSchema)]),
    tags: z.array(z.union([z.number(), ModelsTagSchema])).nullable().optional(),
    videos: z.array(z.object({
      title: z.string(),
      url: z.string().nullable().optional(),
      id: z.string().nullable().optional()
    })).nullable().optional()
  }),
  relatedResources: z.object({
    relatedPosts: z.array(z.union([z.number(), PostSchema])).nullable().optional(),
    relatedModels: z.array(z.union([z.number(), ModelSchema])).nullable().optional()
  }).optional(),
  buildLog: z.array(z.object({
    title: z.string(),
    content: RichTextSchema.nullable().optional(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  image: z.array(z.union([z.number(), MediaSchema])).nullable().optional(),
  meta: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    image: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional()
  }).optional(),
  updatedAt: z.string(),
  createdAt: z.string()
}));

/**
 * Zod schema for kits
 */
export const KitSchema = z.object({
  id: z.number(),
  full_title: z.string(),
  title: z.string(),
  kit_number: z.string(),
  year_released: z.number(),
  scalemates: z.string().nullable().optional(),
  models: z.object({
    docs: z.array(z.union([z.number(), ModelSchema])).optional(),
    hasNextPage: z.boolean().optional(),
    totalDocs: z.number().optional()
  }).optional(),
  manufacturer: z.union([z.number(), ManufacturerSchema]),
  scale: z.union([z.number(), ScaleSchema]),
  boxart: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for forms
 */
export const FormSchema = z.object({
  id: z.number(),
  title: z.string(),
  fields: z.array(z.union([
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
      message: RichTextSchema.nullable().optional(),
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
      options: z.array(z.object({
        label: z.string(),
        value: z.string(),
        id: z.string().nullable().optional()
      })).nullable().optional(),
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
  ])).nullable().optional(),
  submitButtonLabel: z.string().nullable().optional(),
  confirmationType: z.enum(['message', 'redirect']).nullable().optional(),
  confirmationMessage: RichTextSchema.nullable().optional(),
  redirect: z.object({
    url: z.string()
  }).optional(),
  emails: z.array(z.object({
    emailTo: z.string().nullable().optional(),
    cc: z.string().nullable().optional(),
    bcc: z.string().nullable().optional(),
    replyTo: z.string().nullable().optional(),
    emailFrom: z.string().nullable().optional(),
    subject: z.string(),
    message: RichTextSchema.nullable().optional(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for form submissions
 */
export const FormSubmissionSchema = z.object({
  id: z.number(),
  form: z.union([z.number(), FormSchema]),
  submissionData: z.array(z.object({
    field: z.string(),
    value: z.string(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for search
 */
export const SearchSchema = z.object({
  id: z.number(),
  title: z.string().nullable().optional(),
  priority: z.number().nullable().optional(),
  doc: z.union([
    z.object({
      relationTo: z.literal('posts'),
      value: z.union([z.number(), PostSchema])
    }),
    z.object({
      relationTo: z.literal('pages'),
      value: z.union([z.number(), PageSchema])
    }),
    z.object({
      relationTo: z.literal('models'),
      value: z.union([z.number(), ModelSchema])
    }),
    z.object({
      relationTo: z.literal('gardens'),
      value: z.union([z.number(), GardenSchema])
    })
  ]),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for map markers
 */
export const MapMarkerSchema = z.object({
  id: z.number(),
  title: z.string(),
  location: z.tuple([z.number(), z.number()]),
  visits: z.number().nullable().optional(),
  rating: z.number().nullable().optional(),
  links: z.array(z.object({
    title: z.string(),
    album: z.object({
      relationTo: z.literal('gallery-albums'),
      value: z.union([z.number(), GalleryAlbumSchema])
    }).nullable().optional(),
    url: z.string().nullable().optional(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for payload jobs
 */
export const PayloadJobSchema = z.object({
  id: z.number(),
  input: z.union([
    z.record(z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean()
  ]).nullable().optional(),
  taskStatus: z.union([
    z.record(z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean()
  ]).nullable().optional(),
  completedAt: z.string().nullable().optional(),
  totalTried: z.number().nullable().optional(),
  hasError: z.boolean().nullable().optional(),
  error: z.union([
    z.record(z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean()
  ]).nullable().optional(),
  log: z.array(z.object({
    executedAt: z.string(),
    completedAt: z.string(),
    taskSlug: z.enum(['inline', 'schedulePublish']),
    taskID: z.string(),
    input: z.union([
      z.record(z.unknown()),
      z.array(z.unknown()),
      z.string(),
      z.number(),
      z.boolean()
    ]).nullable().optional(),
    output: z.union([
      z.record(z.unknown()),
      z.array(z.unknown()),
      z.string(),
      z.number(),
      z.boolean()
    ]).nullable().optional(),
    state: z.enum(['failed', 'succeeded']),
    error: z.union([
      z.record(z.unknown()),
      z.array(z.unknown()),
      z.string(),
      z.number(),
      z.boolean()
    ]).nullable().optional(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  taskSlug: z.enum(['inline', 'schedulePublish']).nullable().optional(),
  queue: z.string().nullable().optional(),
  waitUntil: z.string().nullable().optional(),
  processing: z.boolean().nullable().optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for payload locked documents
 */
export const PayloadLockedDocumentSchema = z.object({
  id: z.number(),
  document: z.union([
    z.object({
      relationTo: z.literal('map-markers'),
      value: z.union([z.number(), MapMarkerSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('users'),
      value: z.union([z.number(), UserSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('media'),
      value: z.union([z.number(), MediaSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('posts'),
      value: z.union([z.number(), PostSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('posts-categories'),
      value: z.union([z.number(), PostsCategorySchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('posts-tags'),
      value: z.union([z.number(), PostsTagSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('pages'),
      value: z.union([z.number(), PageSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('roles'),
      value: z.union([z.number(), RoleSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('gallery-albums'),
      value: z.union([z.number(), GalleryAlbumSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('gallery-images'),
      value: z.union([z.number(), GalleryImageSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('gallery-tags'),
      value: z.union([z.number(), GalleryTagSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('gallery-categories'),
      value: z.union([z.number(), GalleryCategorySchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('gardens'),
      value: z.union([z.number(), GardenSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('kits'),
      value: z.union([z.number(), KitSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('scales'),
      value: z.union([z.number(), ScaleSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('manufacturers'),
      value: z.union([z.number(), ManufacturerSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('models-tags'),
      value: z.union([z.number(), ModelsTagSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('models'),
      value: z.union([z.number(), ModelSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('forms'),
      value: z.union([z.number(), FormSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('form-submissions'),
      value: z.union([z.number(), FormSubmissionSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('search'),
      value: z.union([z.number(), SearchSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('payload-folders'),
      value: z.union([z.number(), FolderInterfaceSchema])
    }).nullable(),
    z.object({
      relationTo: z.literal('payload-jobs'),
      value: z.union([z.number(), PayloadJobSchema])
    }).nullable()
  ]).optional(),
  globalSlug: z.string().nullable().optional(),
  user: z.object({
    relationTo: z.literal('users'),
    value: z.union([z.number(), UserSchema])
  }),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for payload preferences
 */
export const PayloadPreferenceSchema = z.object({
  id: z.number(),
  user: z.object({
    relationTo: z.literal('users'),
    value: z.union([z.number(), UserSchema])
  }),
  key: z.string().nullable().optional(),
  value: z.union([
    z.record(z.unknown()),
    z.array(z.unknown()),
    z.string(),
    z.number(),
    z.boolean()
  ]).nullable().optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for payload migrations
 */
export const PayloadMigrationSchema = z.object({
  id: z.number(),
  name: z.string().nullable().optional(),
  batch: z.number().nullable().optional(),
  updatedAt: z.string(),
  createdAt: z.string()
});

/**
 * Zod schema for site meta
 */
export const SiteMetaSchema = z.object({
  id: z.number(),
  siteMeta: z.array(z.object({
    title: z.string(),
    description: z.string(),
    path: z.string(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional()
});

/**
 * Zod schema for site navigation
 */
export const SiteNavigationSchema = z.object({
  id: z.number(),
  navItems: z.array(z.object({
    title: z.string(),
    link: z.string(),
    childNodes: z.array(z.object({
      title: z.string(),
      link: z.string(),
      order: z.number(),
      icon: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional(),
      visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']),
      allowedRoles: z.array(z.union([z.number(), RoleSchema])).nullable().optional(),
      allowedUsers: z.array(z.union([z.number(), UserSchema])).nullable().optional(),
      id: z.string().nullable().optional()
    })).nullable().optional(),
    order: z.number(),
    icon: z.union([z.union([z.number(), z.null()]), MediaSchema]).optional(),
    visibility: z.enum(['ALL', 'AUTHENTICATED', 'ANONYMOUS', 'PRIVILEGED']),
    allowedRoles: z.array(z.union([z.number(), RoleSchema])).nullable().optional(),
    allowedUsers: z.array(z.union([z.number(), UserSchema])).nullable().optional(),
    id: z.string().nullable().optional()
  })).nullable().optional(),
  updatedAt: z.string().nullable().optional(),
  createdAt: z.string().nullable().optional()
});

/**
 * Zod schema for task schedule publish
 */
export const TaskSchedulePublishSchema = z.object({
  input: z.object({
    type: z.enum(['publish', 'unpublish']).nullable().optional(),
    locale: z.string().nullable().optional(),
    doc: z.union([
      z.object({
        relationTo: z.literal('posts'),
        value: z.union([z.number(), PostSchema])
      }).nullable(),
      z.object({
        relationTo: z.literal('pages'),
        value: z.union([z.number(), PageSchema])
      }).nullable()
    ]).optional(),
    global: z.string().nullable().optional(),
    user: z.union([z.union([z.number(), z.null()]), UserSchema]).optional()
  }),
  output: z.unknown().optional()
});

/**
 * Zod schema for auth
 */
export const AuthSchema = z.record(z.unknown());

/**
 * Zod schema for configuration
 */
export const ConfigSchema = z.object({
  auth: z.object({
    users: UserAuthOperationsSchema
  }),
  blocks: z.record(z.never()),
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
    'payload-folders': z.lazy(() => FolderInterfaceSchema),
    'payload-jobs': z.lazy(() => PayloadJobSchema),
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
    'map-markers': z.union([
      z.lazy(() => MapMarkersSelectSchema(false)),
      z.lazy(() => MapMarkersSelectSchema(true))
    ]),
    users: z.union([
      z.lazy(() => UsersSelectSchema(false)),
      z.lazy(() => UsersSelectSchema(true))
    ]),
    media: z.union([
      z.lazy(() => MediaSelectSchema(false)),
      z.lazy(() => MediaSelectSchema(true))
    ]),
    posts: z.union([
      z.lazy(() => PostsSelectSchema(false)),
      z.lazy(() => PostsSelectSchema(true))
    ]),
    'posts-categories': z.union([
      z.lazy(() => PostsCategoriesSelectSchema(false)),
      z.lazy(() => PostsCategoriesSelectSchema(true))
    ]),
    'posts-tags': z.union([
      z.lazy(() => PostsTagsSelectSchema(false)),
      z.lazy(() => PostsTagsSelectSchema(true))
    ]),
    pages: z.union([
      z.lazy(() => PagesSelectSchema(false)),
      z.lazy(() => PagesSelectSchema(true))
    ]),
    roles: z.union([
      z.lazy(() => RolesSelectSchema(false)),
      z.lazy(() => RolesSelectSchema(true))
    ]),
    'gallery-albums': z.union([
      z.lazy(() => GalleryAlbumsSelectSchema(false)),
      z.lazy(() => GalleryAlbumsSelectSchema(true))
    ]),
    'gallery-images': z.union([
      z.lazy(() => GalleryImagesSelectSchema(false)),
      z.lazy(() => GalleryImagesSelectSchema(true))
    ]),
    'gallery-tags': z.union([
      z.lazy(() => GalleryTagsSelectSchema(false)),
      z.lazy(() => GalleryTagsSelectSchema(true))
    ]),
    'gallery-categories': z.union([
      z.lazy(() => GalleryCategoriesSelectSchema(false)),
      z.lazy(() => GalleryCategoriesSelectSchema(true))
    ]),
    gardens: z.union([
      z.lazy(() => GardensSelectSchema(false)),
      z.lazy(() => GardensSelectSchema(true))
    ]),
    kits: z.union([
      z.lazy(() => KitsSelectSchema(false)),
      z.lazy(() => KitsSelectSchema(true))
    ]),
    scales: z.union([
      z.lazy(() => ScalesSelectSchema(false)),
      z.lazy(() => ScalesSelectSchema(true))
    ]),
    manufacturers: z.union([
      z.lazy(() => ManufacturersSelectSchema(false)),
      z.lazy(() => ManufacturersSelectSchema(true))
    ]),
    'models-tags': z.union([
      z.lazy(() => ModelsTagsSelectSchema(false)),
      z.lazy(() => ModelsTagsSelectSchema(true))
    ]),
    models: z.union([
      z.lazy(() => ModelsSelectSchema(false)),
      z.lazy(() => ModelsSelectSchema(true))
    ]),
    forms: z.union([
      z.lazy(() => FormsSelectSchema(false)),
      z.lazy(() => FormsSelectSchema(true))
    ]),
    'form-submissions': z.union([
      z.lazy(() => FormSubmissionsSelectSchema(false)),
      z.lazy(() => FormSubmissionsSelectSchema(true))
    ]),
    search: z.union([
      z.lazy(() => SearchSelectSchema(false)),
      z.lazy(() => SearchSelectSchema(true))
    ]),
    'payload-folders': z.union([
      z.lazy(() => PayloadFoldersSelectSchema(false)),
      z.lazy(() => PayloadFoldersSelectSchema(true))
    ]),
    'payload-jobs': z.union([
      z.lazy(() => PayloadJobsSelectSchema(false)),
      z.lazy(() => PayloadJobsSelectSchema(true))
    ]),
    'payload-locked-documents': z.union([
      z.lazy(() => PayloadLockedDocumentsSelectSchema(false)),
      z.lazy(() => PayloadLockedDocumentsSelectSchema(true))
    ]),
    'payload-preferences': z.union([
      z.lazy(() => PayloadPreferencesSelectSchema(false)),
      z.lazy(() => PayloadPreferencesSelectSchema(true))
    ]),
    'payload-migrations': z.union([
      z.lazy(() => PayloadMigrationsSelectSchema(false)),
      z.lazy(() => PayloadMigrationsSelectSchema(true))
    ])
  }),
  db: z.object({
    defaultIDType: z.number()
  }),
  globals: z.object({
    'site-meta': z.lazy(() => SiteMetaSchema),
    'site-navigation': z.lazy(() => SiteNavigationSchema)
  }),
  globalsSelect: z.object({
    'site-meta': z.union([
      z.lazy(() => SiteMetaSelectSchema(false)),
      z.lazy(() => SiteMetaSelectSchema(true))
    ]),
    'site-navigation': z.union([
      z.lazy(() => SiteNavigationSelectSchema(false)),
      z.lazy(() => SiteNavigationSelectSchema(true))
    ])
  }),
  locale: z.null(),
  user: z.intersection(
    UserSchema,
    z.object({
      collection: z.literal('users')
    })
  ),
  jobs: z.object({
    tasks: z.object({
      schedulePublish: TaskSchedulePublishSchema,
      inline: z.object({
        input: z.unknown(),
        output: z.unknown()
      })
    }),
    workflows: z.unknown()
  })
});

/**
 * Creates a MapMarkersSelect schema with generic parameter
 */
export const MapMarkersSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    location: z.boolean().optional(),
    visits: z.boolean().optional(),
    rating: z.boolean().optional(),
    links: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        album: z.boolean().optional(),
        url: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a UsersSelect schema with generic parameter
 */
export const UsersSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    roles: z.boolean().optional(),
    displayName: z.boolean().optional(),
    showNSFW: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    email: z.boolean().optional(),
    resetPasswordToken: z.boolean().optional(),
    resetPasswordExpiration: z.boolean().optional(),
    salt: z.boolean().optional(),
    hash: z.boolean().optional(),
    loginAttempts: z.boolean().optional(),
    lockUntil: z.boolean().optional()
  });
};

/**
 * Creates a MediaSelect schema with generic parameter
 */
export const MediaSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    alt: z.boolean().optional(),
    caption: z.boolean().optional(),
    'gallery-images': z.boolean().optional(),
    relatedPosts: z.boolean().optional(),
    exif: z.boolean().optional(),
    blurhash: z.boolean().optional(),
    folder: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    url: z.boolean().optional(),
    thumbnailURL: z.boolean().optional(),
    filename: z.boolean().optional(),
    mimeType: z.boolean().optional(),
    filesize: z.boolean().optional(),
    width: z.boolean().optional(),
    height: z.boolean().optional(),
    focalX: z.boolean().optional(),
    focalY: z.boolean().optional(),
    sizes: z.union([
      z.boolean(),
      z.object({
        thumbnail: z.union([
          z.boolean(),
          z.object({
            url: z.boolean().optional(),
            width: z.boolean().optional(),
            height: z.boolean().optional(),
            mimeType: z.boolean().optional(),
            filesize: z.boolean().optional(),
            filename: z.boolean().optional()
          })
        ]).optional(),
        square: z.union([
          z.boolean(),
          z.object({
            url: z.boolean().optional(),
            width: z.boolean().optional(),
            height: z.boolean().optional(),
            mimeType: z.boolean().optional(),
            filesize: z.boolean().optional(),
            filename: z.boolean().optional()
          })
        ]).optional(),
        small: z.union([
          z.boolean(),
          z.object({
            url: z.boolean().optional(),
            width: z.boolean().optional(),
            height: z.boolean().optional(),
            mimeType: z.boolean().optional(),
            filesize: z.boolean().optional(),
            filename: z.boolean().optional()
          })
        ]).optional(),
        medium: z.union([
          z.boolean(),
          z.object({
            url: z.boolean().optional(),
            width: z.boolean().optional(),
            height: z.boolean().optional(),
            mimeType: z.boolean().optional(),
            filesize: z.boolean().optional(),
            filename: z.boolean().optional()
          })
        ]).optional(),
        large: z.union([
          z.boolean(),
          z.object({
            url: z.boolean().optional(),
            width: z.boolean().optional(),
            height: z.boolean().optional(),
            mimeType: z.boolean().optional(),
            filesize: z.boolean().optional(),
            filename: z.boolean().optional()
          })
        ]).optional(),
        xlarge: z.union([
          z.boolean(),
          z.object({
            url: z.boolean().optional(),
            width: z.boolean().optional(),
            height: z.boolean().optional(),
            mimeType: z.boolean().optional(),
            filesize: z.boolean().optional(),
            filename: z.boolean().optional()
          })
        ]).optional(),
        og: z.union([
          z.boolean(),
          z.object({
            url: z.boolean().optional(),
            width: z.boolean().optional(),
            height: z.boolean().optional(),
            mimeType: z.boolean().optional(),
            filesize: z.boolean().optional(),
            filename: z.boolean().optional()
          })
        ]).optional()
      })
    ]).optional()
  });
};

/**
 * Creates a PostsSelect schema with generic parameter
 */
export const PostsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    originalPublicationDate: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    word_count: z.boolean().optional(),
    category: z.boolean().optional(),
    tags: z.boolean().optional(),
    relatedPosts: z.boolean().optional(),
    title: z.boolean().optional(),
    featuredImage: z.boolean().optional(),
    content: z.boolean().optional(),
    meta: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        description: z.boolean().optional(),
        image: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    _status: z.boolean().optional()
  });
};

/**
 * Creates a PostsCategoriesSelect schema with generic parameter
 */
export const PostsCategoriesSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a PostsTagsSelect schema with generic parameter
 */
export const PostsTagsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a PagesSelect schema with generic parameter
 */
export const PagesSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    visibility: z.boolean().optional(),
    allowedRoles: z.boolean().optional(),
    blocks: z.union([
      z.boolean(),
      z.object({
        block: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    meta: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        description: z.boolean().optional(),
        image: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    _status: z.boolean().optional()
  });
};

/**
 * Creates a RolesSelect schema with generic parameter
 */
export const RolesSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    name: z.boolean().optional(),
    description: z.boolean().optional(),
    isDefault: z.boolean().optional(),
    permissions: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a GalleryAlbumsSelect schema with generic parameter
 */
export const GalleryAlbumsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    settings: z.union([
      z.boolean(),
      z.object({
        isNsfw: z.boolean().optional(),
        category: z.boolean().optional(),
        tags: z.boolean().optional(),
        visibility: z.boolean().optional(),
        allowedRoles: z.boolean().optional(),
        allowedUsers: z.boolean().optional()
      })
    ]).optional(),
    tracking: z.union([
      z.boolean(),
      z.object({
        views: z.boolean().optional(),
        downloads: z.boolean().optional(),
        likes: z.boolean().optional(),
        dislikes: z.boolean().optional(),
        comments: z.boolean().optional(),
        shares: z.boolean().optional(),
        totalImages: z.boolean().optional()
      })
    ]).optional(),
    title: z.boolean().optional(),
    content: z.boolean().optional(),
    images: z.boolean().optional(),
    meta: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        description: z.boolean().optional(),
        image: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a GalleryImagesSelect schema with generic parameter
 */
export const GalleryImagesSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    settings: z.union([
      z.boolean(),
      z.object({
        slug: z.boolean().optional(),
        slugLock: z.boolean().optional(),
        isNsfw: z.boolean().optional(),
        'gallery-tags': z.boolean().optional(),
        visibility: z.boolean().optional(),
        allowedRoles: z.boolean().optional(),
        allowedUsers: z.boolean().optional()
      })
    ]).optional(),
    selling: z.union([
      z.boolean(),
      z.object({
        isSellable: z.boolean().optional()
      })
    ]).optional(),
    tracking: z.union([
      z.boolean(),
      z.object({
        views: z.boolean().optional(),
        downloads: z.boolean().optional(),
        likes: z.boolean().optional(),
        dislikes: z.boolean().optional(),
        comments: z.boolean().optional(),
        shares: z.boolean().optional()
      })
    ]).optional(),
    title: z.boolean().optional(),
    image: z.boolean().optional(),
    content: z.boolean().optional(),
    albums: z.boolean().optional(),
    meta: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        description: z.boolean().optional(),
        image: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a GalleryTagsSelect schema with generic parameter
 */
export const GalleryTagsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a GalleryCategoriesSelect schema with generic parameter
 */
export const GalleryCategoriesSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a GardensSelect schema with generic parameter
 */
export const GardensSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    name: z.boolean().optional(),
    featuredImage: z.boolean().optional(),
    content: z.boolean().optional(),
    meta: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        description: z.boolean().optional(),
        image: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a KitsSelect schema with generic parameter
 */
export const KitsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    full_title: z.boolean().optional(),
    title: z.boolean().optional(),
    kit_number: z.boolean().optional(),
    year_released: z.boolean().optional(),
    scalemates: z.boolean().optional(),
    models: z.boolean().optional(),
    manufacturer: z.boolean().optional(),
    scale: z.boolean().optional(),
    boxart: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a ScalesSelect schema with generic parameter
 */
export const ScalesSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a ManufacturersSelect schema with generic parameter
 */
export const ManufacturersSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a ModelsTagsSelect schema with generic parameter
 */
export const ModelsTagsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a ModelsSelect schema with generic parameter
 */
export const ModelsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    slug: z.boolean().optional(),
    slugLock: z.boolean().optional(),
    clockify_project: z.boolean().optional(),
    model_meta: z.union([
      z.boolean(),
      z.object({
        featuredImage: z.boolean().optional(),
        status: z.boolean().optional(),
        completionDate: z.boolean().optional(),
        kit: z.boolean().optional(),
        tags: z.boolean().optional(),
        videos: z.union([
          z.boolean(),
          z.object({
            title: z.boolean().optional(),
            url: z.boolean().optional(),
            id: z.boolean().optional()
          })
        ]).optional()
      })
    ]).optional(),
    relatedResources: z.union([
      z.boolean(),
      z.object({
        relatedPosts: z.boolean().optional(),
        relatedModels: z.boolean().optional()
      })
    ]).optional(),
    buildLog: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        content: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    image: z.boolean().optional(),
    meta: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        description: z.boolean().optional(),
        image: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a FormsSelect schema with generic parameter
 */
export const FormsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    fields: z.union([
      z.boolean(),
      z.object({
        checkbox: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            required: z.boolean().optional(),
            defaultValue: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        country: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            required: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        email: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            required: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        message: z.union([
          z.boolean(),
          z.object({
            message: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        number: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            defaultValue: z.boolean().optional(),
            required: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        select: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            defaultValue: z.boolean().optional(),
            placeholder: z.boolean().optional(),
            options: z.union([
              z.boolean(),
              z.object({
                label: z.boolean().optional(),
                value: z.boolean().optional(),
                id: z.boolean().optional()
              })
            ]).optional(),
            required: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        state: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            required: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        text: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            defaultValue: z.boolean().optional(),
            required: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional(),
        textarea: z.union([
          z.boolean(),
          z.object({
            name: z.boolean().optional(),
            label: z.boolean().optional(),
            width: z.boolean().optional(),
            defaultValue: z.boolean().optional(),
            required: z.boolean().optional(),
            id: z.boolean().optional(),
            blockName: z.boolean().optional()
          })
        ]).optional()
      })
    ]).optional(),
    submitButtonLabel: z.boolean().optional(),
    confirmationType: z.boolean().optional(),
    confirmationMessage: z.boolean().optional(),
    redirect: z.union([
      z.boolean(),
      z.object({
        url: z.boolean().optional()
      })
    ]).optional(),
    emails: z.union([
      z.boolean(),
      z.object({
        emailTo: z.boolean().optional(),
        cc: z.boolean().optional(),
        bcc: z.boolean().optional(),
        replyTo: z.boolean().optional(),
        emailFrom: z.boolean().optional(),
        subject: z.boolean().optional(),
        message: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a FormSubmissionsSelect schema with generic parameter
 */
export const FormSubmissionsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    form: z.boolean().optional(),
    submissionData: z.union([
      z.boolean(),
      z.object({
        field: z.boolean().optional(),
        value: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a SearchSelect schema with generic parameter
 */
export const SearchSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    title: z.boolean().optional(),
    priority: z.boolean().optional(),
    doc: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a PayloadFoldersSelect schema with generic parameter
 */
export const PayloadFoldersSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    name: z.boolean().optional(),
    folder: z.boolean().optional(),
    documentsAndFolders: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a PayloadJobsSelect schema with generic parameter
 */
export const PayloadJobsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    input: z.boolean().optional(),
    taskStatus: z.boolean().optional(),
    completedAt: z.boolean().optional(),
    totalTried: z.boolean().optional(),
    hasError: z.boolean().optional(),
    error: z.boolean().optional(),
    log: z.union([
      z.boolean(),
      z.object({
        executedAt: z.boolean().optional(),
        completedAt: z.boolean().optional(),
        taskSlug: z.boolean().optional(),
        taskID: z.boolean().optional(),
        input: z.boolean().optional(),
        output: z.boolean().optional(),
        state: z.boolean().optional(),
        error: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    taskSlug: z.boolean().optional(),
    queue: z.boolean().optional(),
    waitUntil: z.boolean().optional(),
    processing: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a PayloadLockedDocumentsSelect schema with generic parameter
 */
export const PayloadLockedDocumentsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    document: z.boolean().optional(),
    globalSlug: z.boolean().optional(),
    user: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a PayloadPreferencesSelect schema with generic parameter
 */
export const PayloadPreferencesSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    user: z.boolean().optional(),
    key: z.boolean().optional(),
    value: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a PayloadMigrationsSelect schema with generic parameter
 */
export const PayloadMigrationsSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    name: z.boolean().optional(),
    batch: z.boolean().optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional()
  });
};

/**
 * Creates a SiteMetaSelect schema with generic parameter
 */
export const SiteMetaSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    siteMeta: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        description: z.boolean().optional(),
        path: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    globalType: z.boolean().optional()
  });
};

/**
 * Creates a SiteNavigationSelect schema with generic parameter
 */
export const SiteNavigationSelectSchema = <T extends boolean>(isOptional: T) => {
  return z.object({
    navItems: z.union([
      z.boolean(),
      z.object({
        title: z.boolean().optional(),
        link: z.boolean().optional(),
        childNodes: z.union([
          z.boolean(),
          z.object({
            title: z.boolean().optional(),
            link: z.boolean().optional(),
            order: z.boolean().optional(),
            icon: z.boolean().optional(),
            visibility: z.boolean().optional(),
            allowedRoles: z.boolean().optional(),
            allowedUsers: z.boolean().optional(),
            id: z.boolean().optional()
          })
        ]).optional(),
        order: z.boolean().optional(),
        icon: z.boolean().optional(),
        visibility: z.boolean().optional(),
        allowedRoles: z.boolean().optional(),
        allowedUsers: z.boolean().optional(),
        id: z.boolean().optional()
      })
    ]).optional(),
    updatedAt: z.boolean().optional(),
    createdAt: z.boolean().optional(),
    globalType: z.boolean().optional()
  });
};