# CMS handoff: gallery image tracking endpoint

Use this document in the **cms-itsmillertime-dev** repo. The public site (`www-itsmillertime-dev`) records gallery engagement from the lightbox and needs a Payload custom endpoint because anonymous users cannot `PATCH` the `gallery-images` collection directly.

## Why this exists

The site flow is:

1. **Browser** → `POST /api/gallery/images/:id/tracking` on the SvelteKit app (body: `{ "event": "view" | "download" | "like" | "dislike" | "share" }`)
2. **SvelteKit server** → `POST {PUBLIC_PAYLOAD_URL}/api/gallery-image-tracking` on Payload (body: `{ "id": <galleryImageId>, "event": "<same>" }`)
3. **Payload** increments the matching counter on `gallery-images.tracking` and returns updated counts

Without step 2, the site gets **502** responses because Payload blocks unauthenticated updates to `gallery-images`.

Follow the same pattern as the existing **`/api/contact-form`** custom endpoint (`src/endpoints/contact-form.ts`).

---

## Prerequisites (already in CMS)

The `gallery-images` collection should already have a read-only `tracking` group with these number fields (defaults `0`):

- `views`
- `downloads`
- `likes`
- `dislikes`
- `comments` (not incremented by the site yet)
- `shares`

Location: `src/collections/Gallery/Image/index.ts` → `tracking` group.

No schema migration is required if those fields already exist.

---

## Task 1: Create the endpoint handler

**Create** `src/endpoints/gallery-image-tracking.ts`:

```ts
import type { PayloadRequest } from 'payload';

const TRACKING_EVENTS = ['view', 'download', 'like', 'dislike', 'share'] as const;
type TrackingEvent = (typeof TRACKING_EVENTS)[number];

const EVENT_TO_FIELD = {
  view: 'views',
  download: 'downloads',
  like: 'likes',
  dislike: 'dislikes',
  share: 'shares',
} as const;

function normalizeTracking(tracking: Record<string, unknown> | null | undefined) {
  return {
    views: typeof tracking?.views === 'number' ? tracking.views : 0,
    downloads: typeof tracking?.downloads === 'number' ? tracking.downloads : 0,
    likes: typeof tracking?.likes === 'number' ? tracking.likes : 0,
    dislikes: typeof tracking?.dislikes === 'number' ? tracking.dislikes : 0,
    comments: typeof tracking?.comments === 'number' ? tracking.comments : 0,
    shares: typeof tracking?.shares === 'number' ? tracking.shares : 0,
  };
}

export async function galleryImageTrackingHandler(req: PayloadRequest): Promise<Response> {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const parseJson = req.json;
  if (!parseJson) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await parseJson.call(req);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { id, event } = body as Record<string, unknown>;
  const galleryImageId = Number(id);

  if (!Number.isFinite(galleryImageId) || galleryImageId <= 0) {
    return Response.json({ error: 'Invalid gallery image id' }, { status: 400 });
  }

  if (typeof event !== 'string' || !TRACKING_EVENTS.includes(event as TrackingEvent)) {
    return Response.json({ error: 'Invalid tracking event' }, { status: 400 });
  }

  const field = EVENT_TO_FIELD[event as TrackingEvent];

  try {
    const existing = await req.payload.findByID({
      collection: 'gallery-images',
      id: galleryImageId,
      depth: 0,
      overrideAccess: true,
    });

    if (!existing) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    const current = normalizeTracking(
      (existing.tracking as Record<string, unknown> | null | undefined) ?? undefined,
    );
    const nextTracking = { ...current, [field]: current[field] + 1 };

    const updated = await req.payload.update({
      collection: 'gallery-images',
      id: galleryImageId,
      data: { tracking: nextTracking },
      overrideAccess: true,
    });

    return Response.json({ tracking: normalizeTracking(updated.tracking ?? undefined) });
  } catch (err) {
    console.error('[gallery-image-tracking]', err);
    return Response.json({ error: 'Failed to update tracking' }, { status: 500 });
  }
}
```

### Design notes

- **`overrideAccess: true`** is required so the handler can update tracking without an authenticated CMS user.
- Only the five events above are accepted; anything else returns **400**.
- The handler reads the current document, increments one field, and writes the full `tracking` object back (same approach the site originally used).
- `comments` is included in the response shape but is **not** incremented by this endpoint yet.

---

## Task 2: Register the endpoint in Payload config

**Edit** `src/payload.config.ts`:

1. Add the import next to `contactFormHandler`:

```ts
import { galleryImageTrackingHandler } from './endpoints/gallery-image-tracking';
```

2. Add an entry to the `endpoints` array (after `/contact-form`):

```ts
{
  path: '/gallery-image-tracking',
  method: 'post',
  handler: galleryImageTrackingHandler,
},
```

Restart the CMS after deploying so the route is live at:

`POST /api/gallery-image-tracking`

---

## API contract (what the site sends)

### Request

```http
POST /api/gallery-image-tracking
Content-Type: application/json

{
  "id": 788,
  "event": "view"
}
```

| Field   | Type   | Required | Values                                              |
| ------- | ------ | -------- | --------------------------------------------------- |
| `id`    | number | yes      | `gallery-images` document id                        |
| `event` | string | yes      | `view`, `download`, `like`, `dislike`, `share`      |

### Success response (`200`)

```json
{
  "tracking": {
    "views": 1,
    "downloads": 0,
    "likes": 0,
    "dislikes": 0,
    "comments": 0,
    "shares": 0
  }
}
```

### Error responses

| Status | Body                                      | When                          |
| ------ | ----------------------------------------- | ----------------------------- |
| `400`  | `{ "error": "Invalid gallery image id" }` | Bad or missing `id`           |
| `400`  | `{ "error": "Invalid tracking event" }`   | Unknown `event`               |
| `400`  | `{ "error": "Invalid JSON body" }`        | Malformed JSON                |
| `404`  | `{ "error": "Not found" }`                | No `gallery-images` row       |
| `405`  | `{ "error": "Method not allowed" }`     | Not `POST`                    |
| `500`  | `{ "error": "Failed to update tracking" }`| DB/update failure             |

---

## Manual test plan

Replace `788` with a real `gallery-images` id from your environment.

```bash
# Increment a view
curl -s -X POST http://localhost:3000/api/gallery-image-tracking \
  -H 'Content-Type: application/json' \
  -d '{"id":788,"event":"view"}' | jq

# Invalid event → 400
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/gallery-image-tracking \
  -H 'Content-Type: application/json' \
  -d '{"id":788,"event":"bogus"}'

# Missing image → 404
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/gallery-image-tracking \
  -H 'Content-Type: application/json' \
  -d '{"id":999999999,"event":"view"}'
```

Confirm in the Payload admin that the `gallery-images` document’s **Image Meta** sidebar counters update.

### End-to-end via the site

With CMS and site both running locally:

1. Open a gallery album and open an image in the lightbox.
2. In devtools, confirm `POST /api/gallery/images/<id>/tracking` returns **200** (not **502**).
3. Like/dislike/share/download should also return **200** and bump the matching counter.

---

## Security / follow-ups (optional, not required for v1)

The site dedupes some events client-side (`sessionStorage` for views/downloads, `localStorage` for like/dislike), but the endpoint itself does not rate-limit. Consider later:

- Rate limiting by IP or fingerprint
- Rejecting requests without a trusted origin (if not already covered by Payload `csrf` / `cors`)
- A dedicated task queue if write volume becomes high

---

## Checklist for the CMS agent

- [ ] Create `src/endpoints/gallery-image-tracking.ts` (code above)
- [ ] Import handler in `src/payload.config.ts`
- [ ] Register `POST /gallery-image-tracking` in `endpoints`
- [ ] Restart / redeploy CMS
- [ ] `curl` test returns `200` with updated `tracking`
- [ ] Lightbox on the site no longer returns **502** on tracking POSTs
