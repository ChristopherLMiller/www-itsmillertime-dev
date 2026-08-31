import { loadSessionFromEvent, type SessionShape } from '$lib/auth/loadSession.server';
import { hrefWithCallback } from '$lib/auth/returnTo';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const parentData = await event.parent();
	const session = (parentData.session as SessionShape) ?? (await loadSessionFromEvent(event));
	if (!session?.user) {
		redirect(302, hrefWithCallback('/account/login', '/account/profile'));
	}

	const user = session.user;
	return {
		profileUser: {
			id: user.id,
			email: user.email ?? null,
			name: typeof user.name === 'string' ? user.name : null,
			displayName: typeof user.displayName === 'string' ? user.displayName : null,
			nsfwFiltering:
				user.nsfwFiltering === 'hide' ||
				user.nsfwFiltering === 'blur' ||
				user.nsfwFiltering === 'show'
					? user.nsfwFiltering
					: null,
			bggUsername: typeof user.bggUsername === 'string' ? user.bggUsername : null,
			image: typeof user.image === 'string' ? user.image : null
		}
	};
};
