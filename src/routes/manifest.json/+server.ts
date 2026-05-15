import siteManifest from '$lib/site-manifest.json';
import { json, type RequestHandler } from '@sveltejs/kit';

type SiteManifest = typeof siteManifest;

/** Absolute `share_target.action`, `id`, and `scope` improve Android share registration. Origin comes from the request so deploys do not depend on `PUBLIC_URL` at build time. */
function withRequestOrigin(
	base: SiteManifest,
	origin: string
): SiteManifest & { id: string } {
	const st = base.share_target;
	let share_target = st;
	if (st?.action && !st.action.startsWith('http://') && !st.action.startsWith('https://')) {
		const path = st.action.startsWith('/') ? st.action : `/${st.action}`;
		share_target = { ...st, action: `${origin}${path}` };
	}
	return {
		...base,
		scope: '/',
		id: `${origin}/`,
		share_target
	};
}

/** Serves the PWA manifest with an absolute `share_target.action` (helps Android registration). */
export const GET: RequestHandler = ({ url }) => {
	const body = withRequestOrigin(siteManifest, url.origin);
	return json(body, {
		headers: {
			'content-type': 'application/manifest+json; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
};
