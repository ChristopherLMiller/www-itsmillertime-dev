import { PUBLIC_URL } from '$env/static/public';
import siteManifest from '$lib/site-manifest.json';
import { json, type RequestHandler } from '@sveltejs/kit';

type SiteManifest = typeof siteManifest;

function absoluteShareTargetAction(base: SiteManifest): SiteManifest {
	const st = base.share_target;
	if (!st?.action) return base;
	if (st.action.startsWith('http://') || st.action.startsWith('https://')) return base;
	const origin = PUBLIC_URL?.replace(/\/$/, '');
	if (!origin) return base;
	const path = st.action.startsWith('/') ? st.action : `/${st.action}`;
	return {
		...base,
		share_target: {
			...st,
			action: `${origin}${path}`
		}
	};
}

/** Serves the PWA manifest with an absolute `share_target.action` (helps Android registration). */
export const GET: RequestHandler = () => {
	const body = absoluteShareTargetAction(siteManifest);
	return json(body, {
		headers: {
			'content-type': 'application/manifest+json; charset=utf-8',
			'cache-control': 'public, max-age=300'
		}
	});
};
