export function authErrorMessage(
	err: { message?: string | null; code?: string | null } | null | undefined,
	fallback: string
): string {
	return err?.message?.trim() || fallback;
}

export function jsonErrorMessage(payload: unknown, fallback: string): string {
	if (typeof payload !== 'object' || payload == null) return fallback;
	const body = payload as Record<string, unknown>;
	if (typeof body.error === 'string' && body.error.trim()) return body.error;
	if (typeof body.message === 'string' && body.message.trim()) return body.message;
	return fallback;
}
