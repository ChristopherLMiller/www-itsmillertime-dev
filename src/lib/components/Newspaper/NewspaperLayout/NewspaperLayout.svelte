<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { PostsCategory, PostsTag } from '$lib/types/payload-types';
	import { fetchLocalWeatherSummary } from '$lib/utils/fetchLocalWeather';
	import { romanize } from '$lib/utils/romanize';
	import { onMount, type Snippet } from 'svelte';

	type Pagination = {
		page?: number;
		totalPages?: number;
		totalDocs?: number;
		limit?: number;
	};

	interface Props {
		title: string;
		subtitle: string;
		categories: PostsCategory[];
		selectedCategory: string;
		tags: PostsTag[];
		selectedTag: string;
		pagination: Pagination | null;
		/** When false, hides section/topic filters (e.g. single article view). Default true. */
		showFilters?: boolean;
		/** Optional view-transition-name for the quoted masthead subtitle line */
		subtitleTransitionName?: string | null;
		/** Use `'p'` when the page supplies its own `<h1>` in the main column (e.g. article view). Default `h1`. */
		mastheadTitleTag?: 'h1' | 'p';
		children: Snippet;
	}

	let {
		title,
		subtitle,
		categories,
		selectedCategory,
		tags,
		selectedTag,
		pagination,
		showFilters = true,
		subtitleTransitionName = null,
		mastheadTitleTag = 'h1',
		children
	}: Props = $props();

	const currentDate = new Date();
	const year = currentDate.getFullYear();
	const romanYear = romanize(year);
	const dayOfYear = Math.floor(
		(currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) /
			(1000 * 60 * 60 * 24)
	);

	let weatherSummary = $state<string | null>(null);

	const hasFilters = $derived(Boolean(selectedCategory || selectedTag));
	const totalPages = $derived(Math.max(1, pagination?.totalPages ?? 1));
	const currentPage = $derived(pagination?.page ?? 1);
	const totalDocs = $derived(pagination?.totalDocs ?? 0);

	function handleCategoryClick(slug: string | null | undefined) {
		if (!slug) return;
		if (slug === 'all') {
			const url = new URL(page.url);
			url.searchParams.delete('category');
			url.searchParams.set('page', '1');
			void goto(url, { keepFocus: true, noScroll: false });
			return;
		}
		const url = new URL(page.url);
		url.searchParams.set('category', slug);
		url.searchParams.set('page', '1');
		void goto(url, { keepFocus: true, noScroll: false });
	}

	function handleTagClick(slug: string | null | undefined) {
		if (!slug) return;
		if (slug === 'all') {
			const url = new URL(page.url);
			url.searchParams.delete('tag');
			url.searchParams.set('page', '1');
			void goto(url, { keepFocus: true, noScroll: false });
			return;
		}
		const url = new URL(page.url);
		url.searchParams.set('tag', slug);
		url.searchParams.set('page', '1');
		void goto(url, { keepFocus: true, noScroll: false });
	}

	function handleCategorySelect(event: Event) {
		const target = event.target as HTMLSelectElement;
		handleCategoryClick(target.value || 'all');
	}

	function handleTagSelect(event: Event) {
		const target = event.target as HTMLSelectElement;
		handleTagClick(target.value || 'all');
	}

	function clearFilters() {
		const url = new URL(page.url);
		url.searchParams.delete('category');
		url.searchParams.delete('tag');
		url.searchParams.set('page', '1');
		void goto(url, { keepFocus: true, noScroll: false });
	}

	function goToPage(num: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', String(num));
		void goto(url, { keepFocus: true, noScroll: false });
	}

	onMount(() => {
		if (!navigator.geolocation) return;
		const abort = new AbortController();
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const summary = await fetchLocalWeatherSummary(
						pos.coords.latitude,
						pos.coords.longitude,
						{ signal: abort.signal }
					);
					if (!abort.signal.aborted) weatherSummary = summary;
				} catch {
					void 0;
				}
			},
			() => {
				void 0;
			},
			{ enableHighAccuracy: false, maximumAge: 600_000, timeout: 20_000 }
		);
		return () => abort.abort();
	});
</script>

<div class="newspaper-sheet" style:view-transition-name="newspaper-sheet">
	<div class="masthead" style:view-transition-name="newspaper-masthead">
		<div class="masthead-top">
			<span class="masthead-top-col masthead-top-col--start">Est. 2017</span>
			<span class="masthead-top-col masthead-top-col--center">ItsMillerTime Development</span>
			<span class="masthead-top-col masthead-top-col--end">Price: Free-fifty</span>
		</div>
		<svelte:element
			this={mastheadTitleTag}
			class="masthead-title"
			style:view-transition-name="newspaper-kicker"
		>
			{title}
		</svelte:element>
		<div class="masthead-subtitle" style:view-transition-name={subtitleTransitionName ?? undefined}>
			"{subtitle}"
		</div>
	</div>

	<div
		class="edition-bar"
		class:edition-bar--weather={weatherSummary}
		style:view-transition-name="newspaper-edition"
	>
		<span class="edition-date">
			{new Date().toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</span>
		{#if weatherSummary}
			<span class="edition-weather" aria-live="polite">Weather: {weatherSummary}</span>
		{/if}
		<span class="edition-vol">Vol. {romanYear} No. {dayOfYear}</span>
	</div>

	{#if showFilters}
		<div class="filter-bar" style:view-transition-name="newspaper-filters">
			<div class="filter-bar-selects">
				<div class="filter-select-group">
					<label class="filter-label" for="newspaper-section-select">Sections</label>
					<select
						id="newspaper-section-select"
						class="filter-select"
						value={selectedCategory || 'all'}
						onchange={handleCategorySelect}
					>
						<option value="all">All</option>
						{#each categories as category (category.id)}
							<option value={category.slug ?? ''}>{category.title}</option>
						{/each}
					</select>
				</div>
				<div class="filter-select-group">
					<label class="filter-label" for="newspaper-topic-select">Topics</label>
					<select
						id="newspaper-topic-select"
						class="filter-select"
						value={selectedTag || 'all'}
						onchange={handleTagSelect}
					>
						<option value="all">All</option>
						{#each tags as tag (tag.id)}
							<option value={tag.slug ?? ''}>{tag.title}</option>
						{/each}
					</select>
				</div>
				{#if hasFilters}
					<button type="button" class="filter-clear filter-clear--selects" onclick={clearFilters}
						>[clear]</button
					>
				{/if}
			</div>

			<div class="filter-bar-links">
				<div class="filter-bar-line filter-bar-line--sections">
					<span class="filter-label">Sections:</span>
					<button
						type="button"
						class="filter-link filter-link--section"
						class:filter-link--active={!selectedCategory}
						onclick={() => handleCategoryClick('all')}>All</button
					>
					{#each categories as category (category.id)}
						<button
							type="button"
							class="filter-link filter-link--section"
							class:filter-link--active={selectedCategory === category.slug}
							onclick={() => handleCategoryClick(category.slug)}
						>
							{category.title}
						</button>
					{/each}
				</div>
				<div class="filter-bar-line filter-bar-line--topics">
					<span class="filter-label">Topics:</span>
					<button
						type="button"
						class="filter-link filter-link--tag"
						class:filter-link--active={!selectedTag}
						onclick={() => handleTagClick('all')}>All</button
					>
					{#each tags as tag (tag.id)}
						<button
							type="button"
							class="filter-link filter-link--tag"
							class:filter-link--active={selectedTag === tag.slug}
							onclick={() => handleTagClick(tag.slug)}
						>
							{tag.title}
						</button>
					{/each}
					{#if hasFilters}
						<button type="button" class="filter-clear" onclick={clearFilters}>[clear]</button>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div class="main-content" style:view-transition-name="newspaper-main">
		{@render children()}
	</div>

	<footer class="newspaper-footer" style:view-transition-name="newspaper-footer">
		{#if totalPages > 1}
			<p class="page-info">
				Showing page {currentPage} of {totalPages} — {totalDocs} articles total
			</p>
			<nav class="pagination" aria-label="Pagination">
				<button
					type="button"
					class="page-link"
					disabled={currentPage <= 1}
					onclick={() => goToPage(1)}>« First</button
				>
				<span class="page-sep">|</span>
				<button
					type="button"
					class="page-link"
					disabled={currentPage <= 1}
					onclick={() => goToPage(Math.max(1, currentPage - 1))}>‹ Previous</button
				>
				<span class="page-sep">|</span>
				{#each Array.from({ length: totalPages }, (_, i) => i + 1) as p (p)}
					<button
						type="button"
						class="page-link"
						class:page-link--active={p === currentPage}
						onclick={() => goToPage(p)}>{p}</button
					>
					{#if p < totalPages}
						<span class="page-sep page-sep--dot">·</span>
					{/if}
				{/each}
				<span class="page-sep">|</span>
				<button
					type="button"
					class="page-link"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(Math.min(totalPages, currentPage + 1))}>Next ›</button
				>
				<span class="page-sep">|</span>
				<button
					type="button"
					class="page-link"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(totalPages)}>Last »</button
				>
			</nav>
		{/if}
		<div class="footer-text">Editorial: built with care. Thanks for reading.</div>
	</footer>
</div>

<style lang="postcss">
	.newspaper-sheet {
		width: 100%;
		position: relative;
		color: #1a1a1a;
		background-color: #faf8f3;
	}

	.masthead {
		font-family: 'Times New Roman', Times, serif;
		border-bottom: 2px solid #1a1a1a;
		padding: 0.6rem var(--side-margins) 0.65rem;
		text-align: center;
		position: relative;

		&::after {
			content: '';
			position: absolute;
			bottom: -4px;
			left: 0;
			right: 0;
			height: 1px;
			background-color: #1a1a1a;
		}
	}

	.masthead-top {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		align-items: center;
		gap: 0.35rem;
		font-size: var(--fs-xs);
		color: #333;
		text-transform: uppercase;
		letter-spacing: 0.75px;
		margin-bottom: 0.35rem;
	}

	.masthead-top-col--start {
		text-align: start;
		justify-self: stretch;
	}

	.masthead-top-col--center {
		text-align: center;
		justify-self: stretch;
	}

	.masthead-top-col--end {
		text-align: end;
		justify-self: stretch;
	}

	.masthead-title {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-l);
		font-weight: 400;
		color: #1a1a1a;
		margin: 0.3rem 0;
		letter-spacing: 1.5px;
		text-transform: uppercase;
		line-height: 1.05;
	}

	.masthead-subtitle {
		font-size: var(--fs-base);
		font-style: italic;
		color: #555;
		margin-top: 0.15rem;
		line-height: 1.3;
	}

	.edition-bar {
		font-family: 'Times New Roman', Times, serif;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		padding: 0.35rem var(--side-margins);
		border-bottom: 1px solid #1a1a1a;
		font-size: var(--fs-base);
		color: #333;
	}

	.edition-weather {
		display: none;

		@media (min-width: 640px) {
			display: inline;
		}
	}

	.filter-bar {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		padding: 0.4rem var(--side-margins);
		border-bottom: 1px solid #ccc;
	}

	.filter-bar-selects {
		display: grid;
		grid-template-columns: 1fr 1fr;
		align-items: end;
		gap: 0.55rem 0.65rem;
	}

	.filter-bar-links {
		display: none;
	}

	.filter-select-group {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 0;
	}

	.filter-select {
		width: 100%;
		min-width: 0;
		padding: 0.35rem 1.6rem 0.35rem 0.45rem;
		border: 1px solid #bbb;
		border-radius: 0;
		background-color: #fff;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23333' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.45rem center;
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		color: #333;
		cursor: pointer;
		appearance: none;

		&:focus {
			outline: 1px solid #8b0000;
			outline-offset: 1px;
		}
	}

	.filter-clear--selects {
		grid-column: 1 / -1;
		justify-self: start;
		margin-left: 0;
	}

	.filter-bar-line {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0.2rem 0.35rem;
		line-height: 1.35;
	}

	.filter-label {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 1px;
		color: #333;
		margin-right: 0.25rem;
	}

	.filter-select-group .filter-label {
		margin-right: 0;
	}

	.filter-link {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.2s;
		color: #555;

		&:hover {
			color: #8b0000;
			text-decoration: underline;
		}
	}

	.filter-bar-line--sections .filter-link.filter-link--section:not(:last-child)::after {
		content: '•';
		margin: 0 0.35rem;
		color: #999;
	}

	.filter-link.filter-link--tag {
		font-size: var(--fs-xs);
		font-style: italic;
	}

	.filter-bar-line--topics .filter-link.filter-link--tag + .filter-link.filter-link--tag::before {
		content: '/';
		margin: 0 0.3rem;
		color: #aaa;
		font-style: normal;
	}

	.filter-link.filter-link--active {
		color: #8b0000;
		text-decoration: underline;
		font-weight: 700;
	}

	.filter-clear {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		padding: 0;
		margin-left: 0.5rem;
		background: none;
		border: none;
		color: #8b0000;
		cursor: pointer;
		text-decoration: underline;

		&:hover {
			color: #a00;
		}
	}

	@media (min-width: 768px) {
		.filter-bar-selects {
			display: none;
		}

		.filter-bar-links {
			display: flex;
			flex-direction: column;
			gap: 0.4rem;
		}
	}

	.main-content {
		padding: 0.5rem var(--side-margins) 1rem;
	}

	.newspaper-footer {
		border-top: 2px solid #1a1a1a;
		padding: 0.6rem var(--side-margins) 0.75rem;
		font-family: 'Times New Roman', Times, serif;

		&::before {
			content: '';
			display: block;
			height: 1px;
			background-color: #1a1a1a;
			margin-bottom: 0.55rem;
			margin-top: -0.45rem;
		}
	}

	.page-info {
		font-size: var(--fs-xs);
		color: #888;
		text-align: center;
		margin-bottom: 0.45rem;
		line-height: 1.35;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.55rem;
		padding-bottom: 0.55rem;
		border-bottom: 1px solid #ddd;
	}

	.page-link {
		font-family: 'Times New Roman', Times, serif;
		font-size: var(--fs-xs);
		padding: 0;
		background: none;
		border: none;
		cursor: pointer;
		transition: color 0.2s;
		color: #666;

		&:hover:not(:disabled) {
			color: #8b0000;
			text-decoration: underline;
		}

		&:disabled {
			opacity: 0.4;
			cursor: not-allowed;
		}
	}

	.page-link.page-link--active {
		color: #1a1a1a;
		text-decoration: underline;
		font-weight: 700;
	}

	.page-sep {
		color: #999;
		font-size: var(--fs-xs);
	}

	.page-sep.page-sep--dot {
		margin: 0 0.15rem;
	}

	.footer-text {
		text-align: center;
		font-size: var(--fs-base);
		color: #666;
		line-height: 1.35;
	}
</style>
