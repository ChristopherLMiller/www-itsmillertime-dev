<script lang="ts">
	import { page } from '$app/state';
	import { mergeProfileUser } from '$lib/account/profileUser';
	import { getMediaUrl } from '$lib/utils/media-url';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const user = $derived(mergeProfileUser(page.data.session?.user, data.profileUser));
	const showCovers = $derived(user?.nsfwFiltering === 'blur' || user?.nsfwFiltering === 'show');
	const blurNsfw = $derived(user?.nsfwFiltering === 'blur');

	function albumMeta(album: PageData['albums'][number]): string {
		const parts: string[] = [];
		if (album.via) parts.push(album.via);
		if (album.isNsfw) parts.push('NSFW');
		return parts.join(' · ');
	}

	function coverSrc(album: PageData['albums'][number]): string | null {
		const img = album.cover;
		if (!img) return null;
		const thumb = img.sizes?.thumbnail?.url ?? img.sizes?.small?.url ?? img.url;
		return typeof thumb === 'string' && thumb ? getMediaUrl(thumb, album.needsProxy) : null;
	}
</script>

<svelte:head>
	<title>My Content | Profile | itsMillerTime.dev</title>
</svelte:head>

<section class="account-section">
	<h2>My content</h2>
	<p class="account-lede">
		Albums this account can open. Public galleries are on
		<a href="/galleries">Gallery</a>.
	</p>

	{#if data.albums.length && showCovers}
		<ul class="account-albums">
			{#each data.albums as album (album.slug)}
				{@const src = coverSrc(album)}
				{@const meta = albumMeta(album)}
				<li>
					<a class="account-album" href="/galleries/{album.slug}">
						<div class="account-album__cover">
							{#if src}
								<img {src} alt="" class:account-album__nsfw={blurNsfw && album.isNsfw} />
							{/if}
						</div>
						<span class="account-album__title">{album.title}</span>
						{#if meta}
							<span>{meta}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{:else if data.albums.length}
		<ul class="account-list">
			{#each data.albums as album (album.slug)}
				{@const meta = albumMeta(album)}
				<li>
					<a href="/galleries/{album.slug}">{album.title}</a>
					{#if meta}
						<span>{meta}</span>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<p class="account-hint">No extra albums on this account.</p>
	{/if}
</section>
