<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import { modelsListQueriesMatch } from '$lib/cache/modelCache';
	import ModelCard from '$lib/components/ModelCard';
	import Paginator from '$lib/components/Paginator';
	import {
		DEFAULT_MODEL_SORT,
		MODEL_SORT_OPTIONS,
		normalizeModelSort,
		normalizeModelStatus
	} from '$lib/models/filters';
	import { modelsListQueryOptions, queryKeys } from '$lib/query/queries';
	import { queryPersistRestored, seedServerQueryData } from '$lib/query/seedServerQuery';
	import type { PageProps } from './$types';

	const { data }: PageProps = $props();
	const queryClient = useQueryClient();

	const includeNotStarted = $derived(
		data.includeNotStarted ||
			(!!page.data.session?.user &&
				(page.data.session?.user?.role as string[] | undefined)?.includes('admin'))
	);

	const query = createQuery(() =>
		modelsListQueryOptions(
			data.query,
			includeNotStarted,
			includeNotStarted === data.includeNotStarted ? data.initialModels : null
		)
	);

	$effect(() => {
		if (!browser) return;
		void $queryPersistRestored;
		if (includeNotStarted !== data.includeNotStarted) return;
		seedServerQueryData(
			queryClient,
			queryKeys.modelsList(data.query, includeNotStarted),
			data.initialModels
		);
	});

	const list = $derived.by(() => {
		const cached = query.data;
		if (query.isPlaceholderData) return data.initialModels;
		if (cached && modelsListQueriesMatch(cached.query, data.query)) return cached;
		return data.initialModels;
	});
	const models = $derived(list?.models ?? []);
	const meta = $derived(list?.meta);
	const manufacturers = $derived(list?.manufacturers ?? []);
	const scales = $derived(list?.scales ?? []);
	const tags = $derived(list?.tags ?? []);

	const selectedManufacturer = $derived(page.url.searchParams.get('manufacturer') || '');
	const selectedScale = $derived(page.url.searchParams.get('scale') || '');
	const selectedStatus = $derived(normalizeModelStatus(page.url.searchParams.get('status')) ?? '');
	const selectedTag = $derived(
		page.url.searchParams.get('tag') || page.url.searchParams.get('tags') || ''
	);
	const selectedSort = $derived(normalizeModelSort(page.url.searchParams.get('sort')));
	const perPageOptions = [6, 12, 15, 24, 48] as const;
	const selectedLimit = $derived(Number(page.url.searchParams.get('limit')) || 15);

	const hasActiveFilters = $derived(
		Boolean(selectedManufacturer || selectedScale || selectedStatus || selectedTag) ||
			selectedSort !== DEFAULT_MODEL_SORT
	);

	const totalModels = $derived(meta?.totalDocs ?? models.length);

	const statusOptions = $derived(
		[
			{ value: 'NOT_STARTED', label: 'Not started' },
			{ value: 'IN_PROGRESS', label: 'In progress' },
			{ value: 'COMPLETED', label: 'Completed' }
		].filter((option) => includeNotStarted || option.value !== 'NOT_STARTED')
	);

	async function updateParam(key: string, value: string, resetPage = true) {
		const url = new URL(page.url);
		if (value) {
			url.searchParams.set(key, value);
		} else {
			url.searchParams.delete(key);
		}
		// Prefer singular `tag`; drop legacy `tags` when updating filters
		if (key === 'tag') {
			url.searchParams.delete('tags');
		}
		if (resetPage) {
			url.searchParams.set('page', '1');
		}
		await goto(`${url.pathname}${url.search}`, { keepFocus: true, noScroll: true });
	}

	async function handleSelectChange(key: string, event: Event) {
		const target = event.target as HTMLSelectElement;
		await updateParam(key, target.value);
	}

	async function clearFilters() {
		const url = new URL(page.url);
		for (const key of ['manufacturer', 'scale', 'status', 'tag', 'tags', 'sort']) {
			url.searchParams.delete(key);
		}
		url.searchParams.set('page', '1');
		await goto(`${url.pathname}${url.search}`, { keepFocus: true, noScroll: true });
	}
</script>

<section class="binder" aria-label="Model filters">
	<div class="binder__spine" aria-hidden="true"></div>

	<div class="binder__sheet">
		<div class="binder__top">
			<p class="binder__mark">Set checklist</p>
			<div class="binder__count" aria-live="polite">
				<span class="binder__count-num">#{totalModels}</span>
				<span class="binder__count-lbl">{totalModels === 1 ? 'card' : 'cards'}</span>
			</div>
		</div>

		<div class="binder__stats" role="group" aria-label="Filter fields">
			<div class="stat-cell">
				<label class="stat-cell__label" for="model-manufacturer">Mfr</label>
				<select
					id="model-manufacturer"
					class="stat-cell__select"
					value={selectedManufacturer}
					onchange={(event) => handleSelectChange('manufacturer', event)}
				>
					<option value="">Any</option>
					{#each manufacturers as manufacturer (manufacturer.id)}
						<option value={manufacturer.slug ?? ''}>{manufacturer.title}</option>
					{/each}
				</select>
			</div>

			<div class="stat-cell">
				<label class="stat-cell__label" for="model-scale">Scale</label>
				<select
					id="model-scale"
					class="stat-cell__select"
					value={selectedScale}
					onchange={(event) => handleSelectChange('scale', event)}
				>
					<option value="">Any</option>
					{#each scales as scale (scale.id)}
						<option value={scale.slug ?? ''}>{scale.title}</option>
					{/each}
				</select>
			</div>

			<div class="stat-cell">
				<label class="stat-cell__label" for="model-status">Status</label>
				<select
					id="model-status"
					class="stat-cell__select"
					value={selectedStatus}
					onchange={(event) => handleSelectChange('status', event)}
				>
					<option value="">Any</option>
					{#each statusOptions as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="stat-cell">
				<label class="stat-cell__label" for="model-tag">Tag</label>
				<select
					id="model-tag"
					class="stat-cell__select"
					value={selectedTag}
					onchange={(event) => handleSelectChange('tag', event)}
				>
					<option value="">Any</option>
					{#each tags as tag (tag.id)}
						<option value={tag.slug ?? ''}>{tag.title}</option>
					{/each}
				</select>
			</div>

			<div class="stat-cell">
				<label class="stat-cell__label" for="model-sort">Sort</label>
				<select
					id="model-sort"
					class="stat-cell__select"
					value={selectedSort}
					onchange={(event) => handleSelectChange('sort', event)}
				>
					{#each MODEL_SORT_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<div class="stat-cell">
				<label class="stat-cell__label" for="model-limit">Per page</label>
				<select
					id="model-limit"
					class="stat-cell__select"
					value={selectedLimit}
					onchange={(event) => handleSelectChange('limit', event)}
				>
					{#each perPageOptions as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</div>

			{#if hasActiveFilters}
				<div class="stat-cell stat-cell--action">
					<button type="button" class="clear-chip" onclick={clearFilters}>Clear</button>
				</div>
			{/if}
		</div>
	</div>
</section>

{#if models.length > 0}
	<div class="grid">
		{#each models as model (model.id)}
			<ModelCard {model} />
		{/each}
	</div>
	<Paginator {meta} />
{:else}
	<p class="empty">No models match these filters.</p>
{/if}

<style lang="postcss">
	.binder {
		display: grid;
		grid-template-columns: 0.55rem 1fr;
		max-width: 68rem;
		margin: 0 auto 1.75rem;
		background: var(--color-white-lighter);
		border: 2px solid var(--color-primary-darker);
		box-shadow: var(--box-shadow-elev-1);
	}

	.binder__spine {
		background: linear-gradient(
			180deg,
			var(--color-primary-darker),
			var(--color-primary),
			var(--color-primary-lighter)
		);
	}

	.binder__sheet {
		min-width: 0;
		padding: 0.65rem 0.85rem 0.8rem;
	}

	.binder__top {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		padding-bottom: 0.45rem;
		margin-bottom: 0.55rem;
		border-bottom: 2px solid var(--color-primary-darker);
	}

	.binder__mark {
		margin: 0;
		font-family: var(--font-oswald);
		font-size: 0.78rem;
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		text-indent: 0;
		color: var(--color-primary-darker);
	}

	.binder__count {
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
		font-family: var(--font-oswald);
		color: var(--color-tertiary-darker);
	}

	.binder__count-num {
		font-family: var(--font-special-elite);
		font-size: 1.15rem;
		line-height: 1;
		color: var(--color-primary-darker);
	}

	.binder__count-lbl {
		font-size: 0.7rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-tertiary);
	}

	.binder__stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.75rem 0.65rem;
	}

	.stat-cell {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
		padding-bottom: 0.15rem;
		border-bottom: 1px dotted var(--color-tertiary-darker);
	}

	.stat-cell--action {
		grid-column: 1 / -1;
		align-items: center;
		justify-content: center;
		border-bottom: none;
		padding-bottom: 0;
	}

	.stat-cell__label {
		font-family: var(--font-oswald);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-tertiary);
	}

	.stat-cell__select {
		width: 100%;
		min-width: 0;
		margin: 0;
		padding: 0.15rem 1.4rem 0.2rem 0;
		border: none;
		border-radius: 0;
		background-color: transparent;
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 0.1rem center;
		font-family: var(--font-oswald);
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--color-primary-darkest);
		cursor: pointer;
		appearance: none;

		&:focus {
			outline: none;
			color: var(--color-primary);
		}
	}

	.clear-chip {
		padding: 0.3rem 0.85rem;
		border: none;
		background: var(--color-tertiary-lighter);
		color: var(--color-white-lighter);
		font-family: var(--font-oswald);
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		cursor: pointer;
		transform: skew(-10deg);

		&:hover {
			background: var(--color-primary);
		}
	}

	@media screen and (min-width: 900px) {
		.binder {
			grid-template-columns: 0.7rem 1fr;
		}

		.binder__sheet {
			padding: 0.7rem 1.1rem 0.85rem;
		}

		.binder__stats {
			display: flex;
			flex-wrap: wrap;
			align-items: stretch;
			gap: 0.75rem 0;
		}

		.stat-cell {
			flex: 1 1 0;
			padding: 0 0.85rem;
			border-bottom: none;
			border-right: 1px dotted var(--color-tertiary-darker);
		}

		.stat-cell:first-child {
			padding-left: 0;
		}

		.stat-cell--action {
			flex: 0 0 auto;
			padding-right: 0;
			border-right: none;
			justify-content: flex-end;
			align-items: flex-end;
		}

		.stat-cell:last-child {
			border-right: none;
			padding-right: 0;
		}
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, 350px);
		grid-template-rows: masonry;
		justify-content: center;
		gap: 2rem;
	}

	.empty {
		text-align: center;
		padding: 2rem 1rem;
		font-family: var(--font-oswald);
		color: var(--color-tertiary);
	}
</style>
