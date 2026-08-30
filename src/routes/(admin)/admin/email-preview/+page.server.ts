import type { PageServerLoad } from './$types';

export type EmailTemplateMeta = { id: string; label: string };

export const load: PageServerLoad = async ({ fetch }) => {
	const res = await fetch('/api/admin/email-preview', { headers: { Accept: 'application/json' } });
	const body = await res.json().catch(() => ({}));
	if (!res.ok) {
		const message =
			typeof body === 'object' && body && typeof (body as { error?: string }).error === 'string'
				? (body as { error: string }).error
				: 'Failed to load email templates';
		return { templates: [] as EmailTemplateMeta[], loadError: message };
	}
	const templates = Array.isArray((body as { templates?: unknown }).templates)
		? ((body as { templates: EmailTemplateMeta[] }).templates ?? [])
		: [];
	return { templates, loadError: null as string | null };
};
