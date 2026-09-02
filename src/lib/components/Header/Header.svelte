<script lang="ts">
	import { page } from '$app/state';
	import type { SiteMeta } from '$lib/types/payload-types';
	import { getSiteLayoutContext } from '$lib/query/siteLayoutContext';

	const siteLayout = getSiteLayoutContext();
	const siteMeta: SiteMeta | undefined = $derived(
		siteLayout ? siteLayout().siteMeta : page.data.siteMeta
	);
	const path = $derived(page.url.pathname);
	const currentPage = $derived(findMatchingPath(path, siteMeta?.siteMeta));
	const isProfile = $derived(path === '/account/profile' || path.startsWith('/account/profile/'));
	const pageDescription = $derived(isProfile ? 'Your account' : currentPage?.description);
	const pageTitle = $derived(isProfile ? 'Profile' : currentPage?.title);

	function findMatchingPath(url: string, siteMeta: SiteMeta['siteMeta'] | undefined) {
		const exactMatch = siteMeta?.find((item) => item.path === url);
		if (exactMatch) return exactMatch;

		const urlParts = url.split('/').filter(Boolean);
		if (urlParts.length === 0) return undefined;

		return siteMeta?.find((item) => {
			const itemPath = item.path.split('/').filter(Boolean);
			return itemPath.length > 0 && urlParts[0] === itemPath[0];
		});
	}
</script>

<header>
	<div class="meta">
		<p class="page-description text-small">{pageDescription}</p>
		<p class="page-title text-large">{pageTitle}</p>
	</div>
</header>

<style lang="postcss">
	header {
		font-family: var(--font-roboto);
		grid-area: header;
		color: var(--color-white-lighter);
		margin-block-end: var(--top-bar-height);
		clip-path: polygon(0 0, 100% 0, 100% calc(100% - clamp(3rem, 6vw, 6rem)), 0 100%);
		background: var(--color-primary);
		/* padding-block + description line + large title — avoids collapse before siteMeta */
		min-height: calc(1rem + clamp(3rem, 6vw, 6rem) + 1.5em + var(--fs-l));
	}

	.meta {
		padding-inline: 2rem;
		padding-block: 1rem clamp(3rem, 6vw, 6rem);
		font-weight: 300;
		text-transform: capitalize;
		letter-spacing: -0.4px;

		.page-description {
			letter-spacing: 0.5px;
			min-height: 1.5em;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}

		.page-title {
			padding-inline-start: 4rem;
			font-family: var(--font-special-elite);
			font-weight: 600;
			text-transform: uppercase;
			line-height: 1;
			min-height: var(--fs-l);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
</style>
