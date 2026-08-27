import sharp from 'sharp';

import { isGifMedia, isVideoMedia, toCloudflareMediaUrl } from '$lib/utils/media-url';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-5';

const ANTHROPIC_MESSAGES_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_JPEG_BYTES = 4 * 1024 * 1024;
const MAX_PREVIEW_EDGE = 1280;
const MAX_ALT_CHARS = 280;
const MAX_ALBUM_TITLE_CHARS = 120;

const SYSTEM_PROMPT = [
	'You write short image titles that also work as HTML alt text for a photographer’s website.',
	'Describe the visible scene: subject, setting, and notable action or mood.',
	'One sentence or short phrase, typically 8–20 words.',
	'Do not start with “Image of”, “Photo of”, “Picture of”, or “A photo showing”.',
	'No quotation marks, hashtags, camera settings, watermarks, or commentary about the task.',
	'If an album title is provided, use it only as optional context; do not copy it unless it matches what is in the photo.',
	'Return only the alt text.'
].join(' ');

export class SuggestImageAltError extends Error {
	status: number;

	constructor(message: string, status = 502) {
		super(message);
		this.name = 'SuggestImageAltError';
		this.status = status;
	}
}

type PreviewMedia = {
	url?: string | null;
	filename?: string | null;
	mimeType?: string | null;
	sizes?: {
		small?: { url?: string | null } | null;
		medium?: { url?: string | null } | null;
		large?: { url?: string | null } | null;
	} | null;
};

/** Prefer a medium derivative; GIFs must use the original (size variants are filmstrips). */
export function pickGalleryPreviewPath(doc: PreviewMedia): string | null {
	if (isVideoMedia(doc)) return null;
	if (isGifMedia(doc)) return doc.url ?? null;
	return (
		doc.sizes?.medium?.url ?? doc.sizes?.small?.url ?? doc.sizes?.large?.url ?? doc.url ?? null
	);
}

/** Map a Payload upload path onto the internal CMS API origin (`…/api`). */
export function galleryFileUrlForPayloadApi(path: string, apiBase: string): string {
	let pathname: string;
	let search: string;
	if (/^https?:\/\//i.test(path)) {
		const url = new URL(path);
		pathname = url.pathname;
		search = url.search;
	} else {
		const q = path.indexOf('?');
		pathname = q === -1 ? path : path.slice(0, q);
		search = q === -1 ? '' : path.slice(q);
		if (!pathname.startsWith('/')) pathname = `/${pathname}`;
	}
	const rest = pathname.replace(/^\/api(?=\/)/, '');
	return `${apiBase.replace(/\/$/, '')}${rest}${search}`;
}

export function parseAlbumTitle(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.replace(/\s+/g, ' ').trim().slice(0, MAX_ALBUM_TITLE_CHARS);
	return trimmed || undefined;
}

export function parseSuggestedAlt(text: string): string {
	let value = text.replace(/\r\n/g, '\n').trim();
	value = value.replace(/^```(?:\w+)?\s*/u, '').replace(/\s*```$/u, '');
	value = value.replace(/^(?:alt\s*text|title|suggestion)\s*:\s*/iu, '');
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith('“') && value.endsWith('”')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		value = value.slice(1, -1).trim();
	}
	value = value.replace(/\s+/g, ' ').trim();
	if (!value) return '';
	if (value.length > MAX_ALT_CHARS) {
		return value.slice(0, MAX_ALT_CHARS - 1).trimEnd() + '…';
	}
	return value;
}

export async function jpegPreviewFromBytes(bytes: Buffer | Uint8Array): Promise<Buffer> {
	try {
		const jpeg = await sharp(bytes, { animated: false, failOn: 'truncated' })
			.rotate()
			.resize({
				width: MAX_PREVIEW_EDGE,
				height: MAX_PREVIEW_EDGE,
				fit: 'inside',
				withoutEnlargement: true
			})
			.jpeg({ quality: 82, mozjpeg: true })
			.toBuffer();
		if (jpeg.byteLength > MAX_JPEG_BYTES) {
			throw new SuggestImageAltError('Prepared image is too large', 413);
		}
		return jpeg;
	} catch (err) {
		if (err instanceof SuggestImageAltError) throw err;
		throw new SuggestImageAltError('Could not prepare image for analysis', 422);
	}
}

export async function fetchGalleryPreviewBytes(opts: {
	path: string;
	restricted: boolean;
	apiBase: string;
	fetchPublic: typeof fetch;
	fetchAuthenticated: typeof fetch;
}): Promise<Uint8Array> {
	const tryFetch = async (url: string, fetchFn: typeof fetch): Promise<Uint8Array | null> => {
		const res = await fetchFn(url, {
			headers: { accept: 'image/*,*/*;q=0.8' },
			redirect: 'follow'
		});
		if (!res.ok) return null;
		const lengthHeader = res.headers.get('content-length');
		if (lengthHeader) {
			const length = Number(lengthHeader);
			if (Number.isFinite(length) && length > MAX_SOURCE_BYTES) {
				throw new SuggestImageAltError('Image is too large to analyze', 413);
			}
		}
		const buf = new Uint8Array(await res.arrayBuffer());
		if (buf.byteLength > MAX_SOURCE_BYTES) {
			throw new SuggestImageAltError('Image is too large to analyze', 413);
		}
		if (buf.byteLength === 0) return null;
		return buf;
	};

	if (!opts.restricted) {
		const cdnUrl = toCloudflareMediaUrl(opts.path);
		if (cdnUrl) {
			try {
				const publicBytes = await tryFetch(cdnUrl, opts.fetchPublic);
				if (publicBytes) return publicBytes;
			} catch (err) {
				if (err instanceof SuggestImageAltError) throw err;
			}
		}
	}

	const cmsUrl = galleryFileUrlForPayloadApi(opts.path, opts.apiBase);
	const authedBytes = await tryFetch(cmsUrl, opts.fetchAuthenticated);
	if (authedBytes) return authedBytes;

	throw new SuggestImageAltError('Could not load image for analysis', 502);
}

type AnthropicContentBlock = {
	type?: string;
	text?: string;
};

type AnthropicMessageResponse = {
	content?: AnthropicContentBlock[];
	error?: { message?: string; type?: string };
};

export async function suggestImageAlt(opts: {
	jpegBytes: Buffer | Uint8Array;
	albumTitle?: string;
	apiKey: string;
	model: string;
	fetchFn?: typeof fetch;
}): Promise<{ alt: string }> {
	const fetchFn = opts.fetchFn ?? globalThis.fetch;
	const userLines = ['Write alt text for this photograph.'];
	if (opts.albumTitle) {
		userLines.push(`Album context (optional): ${opts.albumTitle}`);
	}

	let res: Response;
	try {
		res = await fetchFn(ANTHROPIC_MESSAGES_URL, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-api-key': opts.apiKey,
				'anthropic-version': ANTHROPIC_VERSION
			},
			body: JSON.stringify({
				model: opts.model,
				max_tokens: 1024,
				temperature: 0.2,
				system: SYSTEM_PROMPT,
				messages: [
					{
						role: 'user',
						content: [
							{
								type: 'image',
								source: {
									type: 'base64',
									media_type: 'image/jpeg',
									data: Buffer.from(opts.jpegBytes).toString('base64')
								}
							},
							{ type: 'text', text: userLines.join('\n') }
						]
					}
				]
			}),
			signal: AbortSignal.timeout(45_000)
		});
	} catch (err) {
		if (err instanceof Error && err.name === 'TimeoutError') {
			throw new SuggestImageAltError('AI suggestion timed out', 504);
		}
		throw new SuggestImageAltError('Could not reach Anthropic', 502);
	}

	if (res.status === 429) {
		throw new SuggestImageAltError('AI is rate limited, try again shortly', 429);
	}
	if (res.status === 401 || res.status === 403) {
		throw new SuggestImageAltError('Anthropic rejected the API key', 503);
	}
	if (!res.ok) {
		throw new SuggestImageAltError('Anthropic request failed', 502);
	}

	let payload: AnthropicMessageResponse | null;
	try {
		payload = (await res.json()) as AnthropicMessageResponse;
	} catch {
		payload = null;
	}

	const text = (payload?.content ?? [])
		.filter((block) => block?.type === 'text' && typeof block.text === 'string')
		.map((block) => block.text as string)
		.join('\n')
		.trim();
	const alt = parseSuggestedAlt(text);
	if (!alt) {
		throw new SuggestImageAltError('No suggestion returned', 502);
	}
	return { alt };
}
