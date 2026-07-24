<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ModelCard from '$lib/components/ModelCard';
	import Paginator from '$lib/components/Paginator';
	import {
		DEFAULT_MODEL_SORT,
		MODEL_SORT_OPTIONS,
		normalizeModelSort,
		normalizeModelStatus
	} from './filters';

	const { data } = $props();

	const models = $derived(data.models);
	const meta = $derived(data.meta);
	const manufacturers = $derived(data.manufacturers);
	const scales = $derived(data.scales);
	const tags = $derived(data.tags);

	const selectedManufacturer = $derived(page.url.searchParams.get('manufacturer') || '');
	const selectedScale = $derived(page.url.searchParams.get('scale') || '');
	const selectedStatus = $derived(normalizeModelStatus(page.url.searchParams.get('status')) ?? '');
	const selectedTag = $derived(
		page.url.searchParams.get('tag') || page.url.searchParams.get('tags') || ''
	);
	const selectedSort = $derived(normalizeModelSort(page.url.searchParams.get('sort')));

	const hasActiveFilters = $derived(
		Boolean(selectedManufacturer || selectedScale || selectedStatus || selectedTag) ||
			selectedSort !== DEFAULT_MODEL_SORT
	);

	const statusOptions = [
		{ value: 'NOT_STARTED', label: 'Not started' },
		{ value: 'IN_PROGRESS', label: 'In progress' },
		{ value: 'COMPLETED', label: 'Completed' }
	] as const;

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

<div class="filters font-oswald" aria-label="Model filters">
	<div class="filter-group">
		<label class="filter-label" for="model-manufacturer">Manufacturer</label>
		<select
			id="model-manufacturer"
			class="filter-select"
			value={selectedManufacturer}
			onchange={(event) => handleSelectChange('manufacturer', event)}
		>
			<option value="">All</option>
			{#each manufacturers as manufacturer (manufacturer.id)}
				<option value={manufacturer.slug ?? ''}>{manufacturer.title}</option>
			{/each}
		</select>
	</div>

	<div class="filter-group">
		<label class="filter-label" for="model-scale">Scale</label>
		<select
			id="model-scale"
			class="filter-select"
			value={selectedScale}
			onchange={(event) => handleSelectChange('scale', event)}
		>
			<option value="">All</option>
			{#each scales as scale (scale.id)}
				<option value={scale.slug ?? ''}>{scale.title}</option>
			{/each}
		</select>
	</div>

	<div class="filter-group">
		<label class="filter-label" for="model-status">Status</label>
		<select
			id="model-status"
			class="filter-select"
			value={selectedStatus}
			onchange={(event) => handleSelectChange('status', event)}
		>
			<option value="">All</option>
			{#each statusOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	<div class="filter-group">
		<label class="filter-label" for="model-tag">Tag</label>
		<select
			id="model-tag"
			class="filter-select"
			value={selectedTag}
			onchange={(event) => handleSelectChange('tag', event)}
		>
			<option value="">All</option>
			{#each tags as tag (tag.id)}
				<option value={tag.slug ?? ''}>{tag.title}</option>
			{/each}
		</select>
	</div>

	<div class="filter-group">
		<label class="filter-label" for="model-sort">Sort</label>
		<select
			id="model-sort"
			class="filter-select"
			value={selectedSort}
			onchange={(event) => handleSelectChange('sort', event)}
		>
			{#each MODEL_SORT_OPTIONS as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>

	{#if hasActiveFilters}
		<button type="button" class="clear-btn" onclick={clearFilters}>Clear</button>
	{/if}

	<div class="result-count" aria-live="polite">
		<span class="result-count-value">{meta?.totalDocs ?? models.length}</span>
		<span class="result-count-label">
			{(meta?.totalDocs ?? models.length) === 1 ? 'model' : 'models'}
		</span>
	</div>
</div>

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
	.filters {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: flex-end;
		gap: 0.65rem 0.85rem;
		max-width: 68rem;
		margin: 0 auto 1.5rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.filter-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-tertiary);
	}

	.filter-select {
		padding: 0.45rem 0.5rem;
		font-size: 0.85rem;
		border: 1px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		cursor: pointer;
		min-width: 9.5rem;
	}

	.clear-btn {
		align-self: stretch;
		padding: 0.45rem 0.85rem;
		font-family: var(--font-oswald);
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		border: 1px solid var(--color-tertiary-lighter);
		background: transparent;
		color: var(--color-tertiary-darker);
		cursor: pointer;

		&:hover {
			border-color: var(--color-primary);
			color: var(--color-primary-darker);
		}
	}

	.result-count {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-self: stretch;
		min-width: 5.5rem;
		padding: 0.45rem 0.75rem;
		text-align: center;
		color: var(--color-tertiary-darker);
		border: 1px solid var(--color-tertiary-lighter);
		background: rgb(255 255 255 / 0.72);
	}

	.result-count-value {
		font-family: var(--font-special-elite);
		font-size: clamp(1.15rem, 2vw, 1.4rem);
		line-height: 1;
		color: var(--color-primary-darker);
	}

	.result-count-label {
		margin-top: 0.2rem;
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
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
