import type { ShareTargetDestination } from '$lib/share-target-destination';

export function isImageFile(f: File): boolean {
	if (typeof f.type === 'string' && f.type.startsWith('image/')) return true;
	const name = f.name.toLowerCase();
	return /\.(heic|heif|jpe?g|png|gif|webp|avif|bmp|tiff?)$/.test(name);
}

export function altFromShareContext(file: File, title: string, text: string, url: string): string {
	const combined = [title, text, url]
		.map((s) => s.trim())
		.filter(Boolean)
		.join(' — ');
	const base = combined || file.name.replace(/\.[^.]+$/, '') || 'Shared image';
	return base.length > 500 ? base.slice(0, 497) + '…' : base;
}

export async function payloadCreateUpload(args: {
	innerFetch: typeof fetch;
	baseURL: string;
	collection: 'media' | 'gallery-images';
	fileBody: Blob;
	filename: string;
	payloadJson: Record<string, unknown>;
}): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
	const formData = new FormData();
	formData.append('file', args.fileBody, args.filename);
	formData.append('_payload', JSON.stringify(args.payloadJson));

	const res = await args.innerFetch(`${args.baseURL.replace(/\/$/, '')}/${args.collection}`, {
		method: 'POST',
		body: formData,
		credentials: 'include'
	});

	let body: unknown;
	try {
		body = await res.json();
	} catch {
		return { ok: false, message: `HTTP ${res.status}` };
	}

	if (!res.ok) {
		const errObj = body as { errors?: { message?: string }[]; message?: string };
		const first = errObj.errors?.[0]?.message ?? errObj.message ?? `HTTP ${res.status}`;
		return { ok: false, message: first };
	}

	const doc = body as { doc?: { id?: number } };
	const id = doc.doc?.id;
	if (typeof id !== 'number') {
		return { ok: false, message: 'Unexpected response from CMS' };
	}
	return { ok: true, id };
}

function buildGalleryImagePayload(albumId: number, alt: string): Record<string, unknown> {
	return {
		alt,
		settings: {
			visibility: 'AUTHENTICATED',
			isNsfw: false
		},
		albums: [albumId]
	};
}

function buildMediaPayload(alt: string): Record<string, unknown> {
	return { alt };
}

export async function uploadForDestination(
	innerFetch: typeof fetch,
	baseURL: string,
	dest: ShareTargetDestination,
	fileBody: Blob,
	filename: string,
	alt: string
): Promise<{ ok: true; id: number } | { ok: false; message: string }> {
	if (dest.mode === 'media') {
		return payloadCreateUpload({
			innerFetch,
			baseURL,
			collection: 'media',
			fileBody,
			filename,
			payloadJson: buildMediaPayload(alt)
		});
	}
	return payloadCreateUpload({
		innerFetch,
		baseURL,
		collection: 'gallery-images',
		fileBody,
		filename,
		payloadJson: buildGalleryImagePayload(dest.albumId, alt)
	});
}
