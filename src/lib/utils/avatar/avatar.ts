/** Normalize email the way Gravatar expects before hashing. */
export function normalizeAvatarEmail(email: string): string {
	return email.trim().toLowerCase();
}

/** SHA-256 hex digest for Gravatar (preferred over legacy MD5). */
export async function hashEmailForGravatar(email: string): Promise<string> {
	const normalized = normalizeAvatarEmail(email);
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type AvatarUrlOptions = {
	/** Provider / Better Auth profile image, if any */
	image?: string | null;
	/** SHA-256 hex of normalized email */
	gravatarHash?: string | null;
	size?: number;
	/** Gravatar default when no custom image is set — identicon is unique per email */
	defaultImage?: 'identicon' | 'mp' | 'retro' | 'robohash' | 'blank';
};

/** Prefer uploaded/OAuth image; otherwise Gravatar (identicon fallback). */
export function getAvatarUrl({
	image,
	gravatarHash,
	size = 160,
	defaultImage = 'identicon'
}: AvatarUrlOptions): string | null {
	if (typeof image === 'string' && image.trim()) return image.trim();
	if (!gravatarHash) return null;
	const params = new URLSearchParams({
		s: String(size),
		d: defaultImage,
		r: 'pg'
	});
	return `https://www.gravatar.com/avatar/${gravatarHash}?${params}`;
}

export function gravatarProfileUrl(email: string): string {
	return `https://gravatar.com/${encodeURIComponent(normalizeAvatarEmail(email))}`;
}
