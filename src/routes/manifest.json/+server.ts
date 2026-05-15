import siteManifest from '$lib/site-manifest.json';
import { json, type RequestHandler } from '@sveltejs/kit';

type SiteManifest = typeof siteManifest;

/**
 * PR previews and alternate hosts must use THIS request's origin for
 * `share_target.action` and `id`. Using `PUBLIC_URL` from the build breaks
 * Android when the installed PWA origin does not match the action URL.
 */
function withInstallIdentity(base: SiteManifest, origin: string): SiteManifest & { id: string } {
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

export const GET: RequestHandler = ({ url }) => {
	const body = withInstallIdentity(siteManifest, url.origin);
	return json(body, {
		headers: {
			'content-type': 'application/manifest+json; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
};
