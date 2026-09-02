import type { PageServerLoad } from './$types';
import {
	albumCoverMedia,
	allowedUserMatches,
	describeContentAlbum,
	type ContentAlbumView
} from '$lib/account/contentAlbums';
import { getPayloadSDK } from '$lib/payload/sdk.server';
import type { GalleryAlbum, GalleryAlbumsSelect } from '$lib/types/payload-types';
import { mediaRequiresAuthProxy } from '$lib/utils/gallery-access';

export const load: PageServerLoad = async ({ fetch, request, parent }) => {
	const { profileUser } = await parent();
	const assignedIds = profileUser?.albums.map((album) => album.id) ?? [];
	const userId = Number(profileUser?.id);
	const roles = profileUser?.role ?? [];
	const showCovers = profileUser?.nsfwFiltering === 'blur' || profileUser?.nsfwFiltering === 'show';
	type AlbumWhere =
		| { id: { in: number[] } }
		| { 'settings.allowedUsers': { contains: number } }
		| { 'settings.permittedRoles': { contains: string } };
	const or: AlbumWhere[] = [];

	if (assignedIds.length) {
		or.push({ id: { in: assignedIds } });
	}
	if (Number.isFinite(userId) && userId > 0) {
		or.push({ 'settings.allowedUsers': { contains: userId } });
	}
	for (const role of roles.filter((role) => role !== 'user')) {
		or.push({ 'settings.permittedRoles': { contains: role } });
	}

	if (or.length === 0) {
		return { albums: [] as ContentAlbumView[] };
	}

	const sdk = getPayloadSDK(fetch, request);
	const albumSelectBase = {
		slug: true,
		title: true,
		settings: {
			isNsfw: true,
			visibility: true,
			permittedRoles: true,
			allowedUsers: true
		}
	} satisfies GalleryAlbumsSelect<true>;
	const albumSelect: GalleryAlbumsSelect<true> = showCovers
		? { ...albumSelectBase, meta: { image: true } }
		: albumSelectBase;

	const toView = (docs: GalleryAlbum[]): ContentAlbumView[] => {
		const albums: ContentAlbumView[] = [];
		for (const album of docs) {
			if (typeof album.slug !== 'string' || typeof album.title !== 'string') continue;
			const matchingRoles = (album.settings?.permittedRoles ?? []).filter((role) =>
				roles.includes(role)
			);
			const described = describeContentAlbum({
				assigned: assignedIds.includes(album.id),
				allowed: allowedUserMatches(album.settings?.allowedUsers, userId),
				matchingRoles
			});
			const isNsfw = album.settings?.isNsfw === true;
			albums.push({
				title: album.title,
				slug: album.slug,
				isNsfw,
				cover: showCovers ? albumCoverMedia(album.meta?.image) : null,
				needsProxy: mediaRequiresAuthProxy(album.settings) || isNsfw,
				...described
			});
		}
		return albums;
	};

	try {
		const result = await sdk.find({
			collection: 'gallery-albums',
			limit: 48,
			depth: showCovers ? 1 : 0,
			sort: 'title',
			select: albumSelect,
			where: { or }
		});
		return { albums: toView((result.docs ?? []) as GalleryAlbum[]) };
	} catch {
		if (!assignedIds.length) {
			return { albums: [] as ContentAlbumView[] };
		}
		const fallback = await sdk.find({
			collection: 'gallery-albums',
			limit: 48,
			depth: showCovers ? 1 : 0,
			sort: 'title',
			select: albumSelect,
			where: { id: { in: assignedIds } }
		});
		return { albums: toView((fallback.docs ?? []) as GalleryAlbum[]) };
	}
};
