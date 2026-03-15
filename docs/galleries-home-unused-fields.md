# Galleries Home Page – Unused API Fields Analysis

This document lists all fields returned by the Payload CMS API for the galleries home page (`/galleries`) that are **not** used for rendering. Use this to narrow the query and improve performance.

---

## Summary: What IS Used

### Gallery Albums (per album)
| Field | Used By |
|-------|---------|
| `id` | Key, `fetchAlbumImagesOnHover`, `PolaroidStack.albumId`, navigation |
| `slug` | `goto(\`/galleries/${gallery.slug}\`)` |
| `title` | `PolaroidStack.caption`, `albumTitle` |
| `settings.isNsfw` | NSFW filtering, `needsProxy`, `isNsfw` |
| `settings.visibility` | `needsProxy` |
| `meta.description` | `PolaroidStack.albumDescription` |
| `meta.image` | Cover image (passed to `PolaroidStack.primary`) |

### meta.image (GalleryImage/Media – cover only)
| Field | Used By |
|-------|---------|
| `id` | `Image` transition name, `PolaroidStack` caption fallback, `nsfwImageIds` |
| `url` | `asMedia` check, `Image`/`GalleryMediaPlayer` |
| `alt` | `Image` alt text |
| `blurhash` | `Image` placeholder |
| `mimeType` | `isVideoMedia` (video vs image) |
| `width`, `height` | `Image` aspect ratio, `GalleryMediaPlayer` aspect ratio |
| `sizes.thumbnail` | `Image` aspect ratio, `selectBestImage` |
| `sizes.small` | `Image.selectBestImage` |
| `sizes.medium` | `Image.selectBestImage` |
| `sizes.large` | `Image.selectBestImage` |
| `sizes.xlarge` | `Image.selectBestImage` |

### Categories
| Field | Used By |
|-------|---------|
| `id` | Key in select |
| `slug` | `FilmStrip`, category filter |
| `title` | `FilmStrip`, select options |

### Tags
| Field | Used By |
|-------|---------|
| `id` | Key in select |
| `slug` | Tag filter |
| `title` | Select options |

### Pagination meta
| Field | Used By |
|-------|---------|
| `totalPages` | `Paginator`, page info |
| `totalDocs` | Page info |
| `hasPrevPage`, `hasNextPage` | `Paginator` buttons |
| `prevPage`, `nextPage` | `Paginator` navigation |

---

## Unused Fields (Safe to Exclude)

### Gallery Albums – Top Level
| Field | Notes |
|-------|-------|
| `slugLock` | Never read |
| `settings.category` | Only used in `where` filter, not for display |
| `settings.tags` | Only used in `where` filter, not for display |
| `settings.permittedRoles` | Never read |
| `settings.allowedUsers` | **Heavy** – full User objects with email, apiKeys, albums, etc. |
| `tracking` | views, downloads, likes, dislikes, comments, shares, totalImages |
| `content` | Full Lexical rich text – **heavy** |
| `images` | Overwritten to `{ docs: [], totalDocs: 0 }` on server anyway |
| `meta.title` | Never read |
| `updatedAt` | Never read |
| `createdAt` | Never read |

### meta.image (GalleryImage) – Unused
| Field | Notes |
|-------|-------|
| `generateSlug` | Never read |
| `slug` | Never read |
| `settings` | isNsfw, gallery-tags, visibility, permittedRoles, allowedUsers |
| `exif` | Never read |
| `tracking` | Never read |
| `caption` | Lexical rich text – never read |
| `albums` | Never read |
| `meta` | Never read |
| `updatedAt`, `createdAt` | Never read |
| `thumbnailURL` | Image uses `sizes.*.url` instead |
| `filename` | Never read |
| `filesize` | Never read |
| `focalX`, `focalY` | Never read |
| `sizes.square` | Not in `selectBestImage` cascade |
| `sizes.og` | Not in `selectBestImage` cascade |

### Categories – Unused
| Field | Notes |
|-------|-------|
| `slugLock` | Never read |
| `updatedAt` | Never read |
| `createdAt` | Never read |

### Tags – Unused
| Field | Notes |
|-------|-------|
| `slugLock` | Never read |
| `updatedAt` | Never read |
| `createdAt` | Never read |

---

## Recommended Payload Query Changes

Add `select` to limit returned fields. Use `depth: 1` for `meta.image` since you only need the image object, not nested relations.

```ts
// gallery-albums
select: {
  id: true,
  slug: true,
  title: true,
  settings: {
    isNsfw: true,
    visibility: true,
    // Omit: category, tags, permittedRoles, allowedUsers
  },
  meta: {
    description: true,
    image: true,  // Populate with limited fields via depth + image select
  },
  // Omit: slugLock, tracking, content, images, updatedAt, createdAt
},

// For meta.image (GalleryImage) - control via depth
// At depth 1, Payload populates image. You may need a custom select
// on the image relation if Payload supports it.
```

**Note:** Payload's `select` applies to the top-level collection. For nested relations like `meta.image`, the populated object follows the `depth` setting. To restrict fields on `meta.image`, you may need to:
1. Use Payload's relation-level select (if available in your SDK version), or
2. Reduce `depth` from 2 to 1 – at depth 1, `meta.image` may be populated with fewer nested fields (e.g. no `settings.allowedUsers` with full User objects).

The biggest wins are:
- **`settings.allowedUsers`** – full User objects (email, apiKeys, albums, nsfwFiltering, etc.)
- **`content`** – Lexical rich text
- **`tracking`** – multiple numeric fields
- **`meta.image`** – exclude `settings`, `exif`, `tracking`, `caption`, `albums`, `meta`, `sizes.square`, `sizes.og`
