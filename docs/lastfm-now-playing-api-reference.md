# Last.fm “now playing” — implementation reference

The **www** site does not call Last.fm directly. It polls **Payload CMS** at **`{PUBLIC_PAYLOAD_API_ENDPOINT}/lastfm/now-playing`** (same path as on the CMS host: `/api/lastfm/now-playing`). Payload should implement the Last.fm `user.getrecenttracks` flow and return the JSON shape below.

## Purpose

- **Input (Payload / server):** Last.fm account + API key.
- **Output:** A small JSON payload: whether the user is currently scrobbling something, plus normalized track metadata for UI (title, artist, album, Last.fm URL, cover image).

## Environment variables (Payload CMS)

| Variable           | Purpose                                      |
| ------------------ | -------------------------------------------- |
| `LASTFM_API_KEY`   | Last.fm API key ([create account / key](https://www.last.fm/api/account/create)) |
| `LASTFM_USERNAME`  | Last.fm username whose recent tracks are read |

Store these as **server-only** secrets on the CMS. They are **not** used by the www repo.

## www site (consumer)

`LastFmNowPlaying.svelte` builds the URL from public env:

- **Production:** `PUBLIC_PAYLOAD_API_ENDPOINT` + `/lastfm/now-playing`
- **Dev:** when `PUBLIC_PAYLOAD_API_ENDPOINT_DEV` differs, that base is used instead (so local CMS on another port works).

Ensure Payload allows **CORS** for `GET` on that route from your site origin if the browser calls cross-origin.

## Last.fm HTTP API (implement on Payload)

**Base URL:** `https://ws.audioscrobbler.com/2.0/`

**Method used:** `user.getrecenttracks`

**Query parameters:**

| Parameter | Value        | Notes |
| --------- | ------------ | ----- |
| `method`  | `user.getrecenttracks` | Required |
| `user`    | `LASTFM_USERNAME` | |
| `api_key` | `LASTFM_API_KEY` | |
| `format`  | `json`       | JSON instead of XML |
| `limit`   | `1`          | Only the single most recent track (enough for “now playing”) |

**Request:** plain `GET` (no auth header; key is in query string).

**Errors:** Non-OK HTTP status should be treated as failure.

## Parsing Last.fm JSON

Relevant subset of the response:

```json
{
  "recenttracks": {
    "track": [
      {
        "name": "Track Title",
        "url": "https://www.last.fm/music/...",
        "artist": { "name": "Artist" },
        "album": { "#text": "Album Name" },
        "image": [
          { "#text": "https://...", "size": "small" },
          { "#text": "https://...", "size": "medium" },
          { "#text": "https://...", "size": "large" },
          { "#text": "https://...", "size": "extralarge" }
        ],
        "@attr": { "nowplaying": "true" }
      }
    ]
  }
}
```

**Edge cases to mirror:**

1. **`recenttracks.track`** may be a **single object** or an **array** — normalize to an array before taking index `0`.
2. **`artist`** may be a **string** or an **object** with `name` or `#text`.
3. **`album`** uses **`#text`** for the album name (when present).
4. **“Now playing”** is indicated by **`@attr.nowplaying === 'true'`** (string) on that track.
5. **Images:** prefer sizes in order **`extralarge` → `large` → `medium` → `small`**, first URL with non-empty `#text`. Fallback: any image entry with a non-empty `#text`.

**Normalization:** Skip invalid tracks: require at least `name` and `url`.

## Public JSON shape (what `LastFmNowPlaying.svelte` expects)

Payload should return **200** and this body:

```ts
type NowPlayingResponse = {
  isPlaying: boolean;
  track: {
    name: string;
    artist: string;
    album: string | null;
    url: string;
    image: string | null;
  } | null;
};
```

- `track` is `null` if the most recent track could not be normalized.

## Caching (optional, on Payload)

Consider a short TTL in memory or Redis to limit Last.fm requests when many clients poll (respect [Last.fm API terms](https://www.last.fm/api/terms)).

## File reference (this repo)

| File | Role |
| ---- | ---- |
| `src/lib/components/LastFmNowPlaying.svelte` | Polls `{PUBLIC_PAYLOAD_API_ENDPOINT}/lastfm/now-playing` |
| `src/storybook/LastFmStoryWrapper.svelte` | Mocks `fetch` for URLs containing `/api/lastfm/` |
