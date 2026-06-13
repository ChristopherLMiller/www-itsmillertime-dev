import { randomBytes } from 'node:crypto';
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

/** HttpOnly cookie holding the opaque draft token after `POST /api/share-target`. */
export const SHARE_TARGET_DRAFT_COOKIE = 'share_target_draft';

export const DRAFT_MAX_BYTES = 15 * 1024 * 1024;
export const DRAFT_MAX_AGE_MS = 15 * 60 * 1000;

export type DraftMeta = {
	originalName: string;
	mimeType: string;
	shareTitle: string;
	shareText: string;
	shareUrl: string;
	createdAt: number;
	/** Number of additional image files dropped (only first is kept). */
	extraImagesDropped: number;
};

function draftDir() {
	return join(tmpdir(), 'share-target-drafts');
}

function pathsFor(token: string) {
	const base = join(draftDir(), token);
	return { bin: base, meta: `${base}.meta.json` as const };
}

/** 32-character lowercase hex opaque token emitted by {@link saveDraft}. */
export function isShareTargetDraftToken(token: string | undefined): token is string {
	return typeof token === 'string' && /^[a-f0-9]{32}$/.test(token);
}

export async function saveDraft(args: {
	buffer: Buffer;
	meta: Omit<DraftMeta, 'createdAt'>;
}): Promise<string> {
	if (args.buffer.byteLength > DRAFT_MAX_BYTES) {
		throw new Error('FILE_TOO_LARGE');
	}
	await mkdir(draftDir(), { recursive: true });
	const token = randomBytes(16).toString('hex');
	const { bin, meta } = pathsFor(token);
	const fullMeta: DraftMeta = { ...args.meta, createdAt: Date.now() };
	await writeFile(bin, args.buffer);
	await writeFile(meta, JSON.stringify(fullMeta), 'utf8');
	return token;
}

export async function readDraftMeta(token: string | undefined): Promise<DraftMeta | null> {
	if (!isShareTargetDraftToken(token)) return null;
	const { bin, meta } = pathsFor(token);
	try {
		const s = await stat(bin);
		if (!s.isFile()) return null;
		if (Date.now() - s.mtimeMs > DRAFT_MAX_AGE_MS) {
			await deleteDraft(token);
			return null;
		}
		const raw = await readFile(meta, 'utf8');
		const parsed = JSON.parse(raw) as DraftMeta;
		if (typeof parsed.originalName !== 'string') return null;
		return parsed;
	} catch {
		return null;
	}
}

export async function readDraftFile(
	token: string | undefined
): Promise<{ buffer: Buffer; meta: DraftMeta } | null> {
	if (!isShareTargetDraftToken(token)) return null;
	const meta = await readDraftMeta(token);
	if (!meta) return null;
	const { bin } = pathsFor(token);
	try {
		const buffer = await readFile(bin);
		return { buffer, meta };
	} catch {
		return null;
	}
}

export async function deleteDraft(token: string | undefined): Promise<void> {
	if (!isShareTargetDraftToken(token)) return;
	const { bin, meta } = pathsFor(token);
	await Promise.allSettled([unlink(bin), unlink(meta)]);
}
