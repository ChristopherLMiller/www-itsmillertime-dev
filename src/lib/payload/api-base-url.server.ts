import { PAYLOAD_INTERNAL_URL } from '$env/static/private';

/**
 * Direct CMS REST base URL for server-side fetches (never the SvelteKit /api proxy).
 * Tolerates a missing newline in `.env` that concatenates the next variable onto this value.
 */
export function getPayloadApiBaseUrl(): string {
	const raw = PAYLOAD_INTERNAL_URL.trim();
	const match = /^https?:\/\/[^\s"']+/i.exec(raw);
	if (!match) {
		throw new Error(
			`Invalid PAYLOAD_INTERNAL_URL (expected https://…/api): ${raw.slice(0, 120)}`
		);
	}
	return match[0].replace(/\/$/, '');
}
