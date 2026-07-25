# CMS → Site Cache Invalidation

Wire this up in **`cms-itsmillertime-dev`** so Payload save/delete immediately purges Redis SWR on **`www-itsmillertime-dev`**.

The site already exposes the webhook and Redis purge logic. CMS work is still TODO.

---

## Why

The frontend caches Payload content in **Upstash Redis** (SWR, ~5 minute soft TTL / long hard TTL). Editing an article in Payload and saving does not update the live site until that cache expires, unless Redis keys are deleted.

There is also **IndexedDB** on the client. Online article/project loads are **network-first** (IDB is offline fallback only), so Redis invalidation is the critical path for “I hit save, refresh, see new content.”

---

## Site side (already done)

| Piece | Location |
| ----- | -------- |
| Webhook endpoint | `POST /api/cache/invalidate` → `src/routes/api/cache/invalidate/+server.ts` |
| Purge logic | `src/lib/cache/invalidateCache.server.ts` |
| Env secret | `CACHE_WEBHOOK_SECRET` (see `.env.example`) |
| Manual admin purge | Admin dock → Upstash tab → “Purge articles” / “Purge projects” (`invalidate-collection` on `/api/admin/upstash-cache`) |

### Auth

Send either:

- `Authorization: Bearer <CACHE_WEBHOOK_SECRET>`, or
- `x-cache-webhook-secret: <CACHE_WEBHOOK_SECRET>`

Same value must be set on the **site** (`CACHE_WEBHOOK_SECRET`) and the **CMS** (suggested name below).

### Request body (flexible)

```json
{ "collection": "posts", "doc": { "id": 42, "slug": "my-slug" }, "operation": "update" }
```

Also accepted:

```json
{ "collection": "posts", "id": 42 }
```

```json
{ "events": [{ "collection": "posts", "doc": { "id": 1 } }] }
```

```json
{ "event": "posts.update", "doc": { "id": 1 } }
```

Globals use the same shape with `collection` set to the global slug (e.g. `"site-meta"`).

### Site env

```bash
CACHE_WEBHOOK_SECRET="<long random secret>"
```

Production site URL used by CMS should be the public www origin, e.g. `https://www.itsmillertime.dev` (or whatever `PUBLIC_URL` / frontend URL is for that environment).

---

## CMS side (TODO in `cms-itsmillertime-dev`)

Repo: `/Users/christophermiller/Code/javascript/cms-itsmillertime-dev`

### Existing related code (incomplete)

CMS already deletes **some** Redis keys directly via `REDIS_URL` (shared Upstash):

| File | Behavior today |
| ---- | -------------- |
| `src/lib/cache/index.ts` | `cacheDel` + keys for `article:{id}`, `layout:meta`, `layout:nav` |
| `src/collections/Posts/Posts/hooks/syncArticleCache.ts` | On publish/unpublish/delete: DEL `payload:article:{id}` only — **does not** clear `articles:list:*` |
| `src/globals/hooks/syncSiteMetaCache.ts` | DEL `payload:layout:meta` |
| `src/globals/hooks/syncSiteNavigationCache.ts` | DEL `payload:layout:nav` |

`payload-plugin-webhooks` is installed (`src/plugins/index.ts`) for admin-configured webhooks; this task can use either **code hooks** (recommended for a single shared secret + fixed URL) or the plugin. Prefer a small shared helper + `afterChange` / `afterDelete` on the collections below so invalidation is guaranteed in all environments.

### Recommended implementation

1. **Env vars (CMS)**

   ```bash
   # Public site origin (no trailing slash), e.g. https://www.itsmillertime.dev
   NEXT_PUBLIC_FRONTEND_URL="https://www.itsmillertime.dev"

   # Must match www CACHE_WEBHOOK_SECRET
   CACHE_WEBHOOK_SECRET="<same secret as site>"
   ```

   Optional override if the invalidate URL is not `{FRONTEND}/api/cache/invalidate`:

   ```bash
   SITE_CACHE_INVALIDATE_URL="https://www.itsmillertime.dev/api/cache/invalidate"
   ```

2. **Add helper** next to existing cache code, e.g. `src/lib/cache/invalidateSiteCache.ts` (re-export from `src/lib/cache/index.ts`):

   - Build URL from `SITE_CACHE_INVALIDATE_URL` or `${NEXT_PUBLIC_FRONTEND_URL}/api/cache/invalidate`
   - `POST` JSON `{ collection, doc: { id, slug }, operation }`
   - Headers: `Authorization: Bearer ${CACHE_WEBHOOK_SECRET}`, `Content-Type: application/json`
   - Fire-and-forget / best-effort: log errors, do **not** fail the Payload save
   - Skip if secret or frontend URL missing (warn once)
   - Optionally keep existing `cacheDel` for the same keys (belt and suspenders); the webhook is the source of truth for full list/pattern purges on the site

3. **Shared collection hooks**

   Thin wrappers:

   ```ts
   // afterChange
   await invalidateSiteCache({
     collection: 'posts', // or global slug
     doc: { id: doc.id, slug: doc.slug },
     operation: 'update',
   })

   // afterDelete
   await invalidateSiteCache({
     collection: 'posts',
     doc: { id: doc.id, slug: doc.slug },
     operation: 'delete',
   })
   ```

   For globals (`site-meta`, `site-navigation`), use `GlobalAfterChangeHook` with the global slug as `collection`.

4. **Replace / extend** `syncArticleCache` so it calls the site webhook (and ideally still DELs the article key locally). Ensure **list** keys are cleared via the site’s `invalidateCacheForCollection('posts')` (webhook), not only the single article key.

5. **Document** the new env vars in CMS `README.md` (there is no `.env.example` today).

### Example hook body the site expects

```ts
await fetch(`${frontendUrl}/api/cache/invalidate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.CACHE_WEBHOOK_SECRET}`,
  },
  body: JSON.stringify({
    collection: 'posts',
    doc: { id: doc.id, slug: doc.slug },
    operation: 'update',
  }),
})
```

---

## Collections / globals that must invalidate

Only wire hooks for content the **site actually Redis-caches today**, plus gallery/media for forward-compat with SWR rules.

### Required (actively written Redis keys on www)

| Payload slug | Type | Site Redis keys purged by webhook |
| ------------ | ---- | --------------------------------- |
| `posts` | collection | `payload:article:{id}` + `payload:articles:list:*` |
| `posts-categories` | collection | `payload:articles:list:*` |
| `posts-tags` | collection | `payload:articles:list:*` |
| `projects` | collection | `payload:projects:list:*` |
| `projects-categories` | collection | `payload:projects:list:*` |
| `projects-technologies` | collection | `payload:projects:list:*` |
| `site-meta` | global | `payload:layout:meta`, `payload:layout:nav`, `payload:layout-data` |
| `site-navigation` | global | same layout keys |
| `pages` | collection | same layout keys (nav/meta side effects; page docs themselves are not Redis-cached) |

### Recommended (embedded media / future gallery SWR)

Site `invalidateCache.server.ts` may need matching `case` arms if not already present — extend www when wiring these:

| Payload slug | Type | Suggested purge |
| ------------ | ---- | --------------- |
| `media` | collection | Broad: articles + article lists + projects lists + layout (+ gallery-image keys if SWR is enabled). Media is embedded in cached payloads. |
| `gallery-albums` | collection | `payload:gallery-album/{id}`, `payload:gallery-album/slug/{slug}*` |
| `gallery-images` | collection | `payload:gallery-image/{id}`, `payload:gallery-image/{id}-*` (+ related album keys if membership changes) |
| `gallery-tags` | collection | gallery album (and image) key patterns when tags are embedded |
| `gallery-categories` | collection | same as tags |

Note: gallery Redis key **rules** exist in www (`src/lib/cache/payloadSwrRules.server.ts`) but writers are dormant until `payloadSwrInit()` is used on those fetches. Still worth calling the webhook so keys stay correct once SWR is turned on.

### Not required yet (no dedicated Redis writers on www)

No-op / skip hooks until the site adds Redis caching:

- `models`, `kits`, `manufacturers`, `models-tags`, `scales`
- `gardens`
- `map-markers`
- `users` and auth plugin collections

---

## www follow-ups (if missing when CMS is wired)

Confirm `src/lib/cache/invalidateCache.server.ts` handles every slug you emit from CMS. As of this doc, the switch covers:

- `posts`, `posts-categories`, `posts-tags`
- `projects`, `projects-categories`, `projects-technologies`
- `site-meta`, `site-navigation`, `pages`

If CMS starts sending `media` / `gallery-*`, **add cases** on the site before or with the CMS hooks:

```ts
case 'gallery-albums':
  // match payload:gallery-album/*
case 'gallery-images':
  // match payload:gallery-image/*
case 'gallery-tags':
case 'gallery-categories':
  // match payload:gallery-album/* (and gallery-image/* if needed)
case 'media':
  // article:*, articles:list:*, projects:list:*, layout:*, gallery-image:*
```

---

## Verification checklist

1. Set matching `CACHE_WEBHOOK_SECRET` on CMS and www (prod + local if testing).
2. Deploy/restart both so env is live.
3. Edit a published post in Payload → save.
4. CMS logs should show a successful invalidate (or no error); site webhook returns `{ ok: true, deletedCount, results }`.
5. Hard-refresh the article on www — content should match CMS immediately (not after ~5 minutes).
6. Repeat for projects list, site nav/meta, and (once implemented) category/tag edits that affect article lists.
7. Fallback: Admin dock → Upstash → “Purge articles” should clear without CMS.

---

## Agent handoff summary

**Goal:** In `cms-itsmillertime-dev`, on `afterChange` / `afterDelete` for the required slugs above, `POST` to www `/api/cache/invalidate` with shared secret.

**Do not change** www webhook contract unless also updating CMS; prefer extending `invalidateCacheForCollection` for new slugs.

**CMS touch points:**

- `src/lib/cache/` — new `invalidateSiteCache` helper
- Collection configs under `src/collections/` for posts, categories, tags, projects, pages (+ gallery/media if desired)
- Globals `src/globals/site-meta.ts`, `src/globals/site-navigation.ts`
- Existing `syncArticleCache` / site-meta / site-navigation hooks — extend or replace
- README env docs

**www reference implementation:**

- `src/routes/api/cache/invalidate/+server.ts`
- `src/lib/cache/invalidateCache.server.ts`
