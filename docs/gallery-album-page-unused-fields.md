# Gallery Album Page – Unused API Fields Analysis

This document lists all fields returned by the Payload CMS API for the gallery album page (`/galleries/[slug]`) that are **not** used for rendering. Use this to narrow the query and improve performance.

**Render tree:** `+page.server.ts` → `+page.svelte` → `GalleryAlbumHeader`, `Polaroid` (→ `Image`, `GalleryMediaPlayer`), `Lightbox` (→ `GalleryLightboxContent`).

---

## Summary: What IS Used

### Gallery Album (per album)
| Field | Used By |
|-------|---------|
| `id` | Merging images, galleryWithAllImages |
| `slug` | URL, canonicalURL |
| `title` | GalleryAlbumHeader, page, GalleryLightboxContent, meta |
| `settings.isNsfw` | Page (isRestricted, albumIsNsfw) |
| `settings.visibility` | Page (isRestricted) |
| `settings.category` | GalleryAlbumHeader (category title) |
| `settings.tags` | GalleryAlbumHeader (tag titles) |
| `content` | GalleryAlbumHeader (Lexical description) |
| `meta.description` | GalleryAlbumHeader, meta |
| `meta.title` | meta (metaTitle) |
| `meta.image` | meta (SEO image) |
| `createdAt` | GalleryAlbumHeader (date formatted) |

### Gallery Images (per image)
| Field | Used By |
|-------|---------|
| `id` | Key, lightbox, extractGalleryMedia |
| `url` | Polaroid, Lightbox, GalleryMediaPlayer, isVideoMedia |
| `alt` | Polaroid, GalleryLightboxContent |
| `caption` | Polaroid, GalleryLightboxContent (Lexical → plain text) |
| `blurhash` | Lightbox placeholder |
| `mimeType` | isVideoMedia |
| `width`, `height` | Lightbox, GalleryLightboxContent, GalleryMediaPlayer |
| `exif` | GalleryLightboxContent (camera settings, date, location) |
| `settings.isNsfw` | extractGalleryMedia (isNsfw per image) |
| `sizes.thumbnail` | Lightbox, Image |
| `sizes.small` | Lightbox imageSrc cascade |
| `sizes.medium` | Lightbox imageSrc cascade |
| `sizes.large` | Lightbox imageSrc cascade |
| `sizes.xlarge` | Lightbox imageSrc cascade |

---

## Unused Fields (Safe to Exclude)

### Gallery Album – Top Level
| Field | Notes |
|-------|-------|
| `slugLock` | Never read |
| `settings.permittedRoles` | Never read |
| `settings.allowedUsers` | **Heavy** – full User objects |
| `tracking` | views, downloads, likes, etc. |
| `images` | Replaced with gallery-images query result |
| `updatedAt` | Never read |

### meta.image (for SEO) – Unused
| Field | Notes |
|-------|-------|
| Full nested object | Only need url for meta tags; can select minimally |

### Gallery Images – Unused
| Field | Notes |
|-------|-------|
| `generateSlug` | Never read |
| `slug` | Never read |
| `settings.gallery-tags` | Never read |
| `settings.visibility` | Never read |
| `settings.permittedRoles` | Never read |
| `settings.allowedUsers` | **Heavy** |
| `tracking` | Never read |
| `albums` | Never read |
| `meta` | Never read |
| `updatedAt`, `createdAt` | Never read |
| `thumbnailURL` | Use sizes.*.url |
| `filename` | Never read |
| `filesize` | Never read |
| `focalX`, `focalY` | Never read |
| `sizes.square` | Not in Lightbox cascade |
| `sizes.og` | Not in Lightbox cascade |

---

## Implementation Notes

- **depth: 2** for gallery-albums is required so `settings.category` and `settings.tags` are populated (GalleryAlbumHeader needs their `title`).
- **depth: 1** for gallery-images is sufficient; we filter by `albums` in the where clause but do not display album data on each image.
- Image components use a size cascade: `xlarge` → `large` → `medium` → `url`. All of `thumbnail`, `small`, `medium`, `large`, `xlarge` are used by `Image.svelte` for responsive selection.
- `meta.image` for the album is used for SEO (og:image); only `url` (and optionally `width`, `height`, `alt`) is needed.
- **gallery-images select disabled:** Payload's `select` on upload collections returns `sizes` in a format that breaks the Lightbox/Image cascade (`sizes.xlarge?.url` etc.). The gallery-images query fetches full documents; only gallery-albums uses select.
