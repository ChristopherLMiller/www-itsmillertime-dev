<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import {
		QUERY_CACHE_STORAGE_KEY,
		clearArticlesServiceWorkerCaches,
		clearPersistedQueryCache,
		deleteCacheStorage,
		deleteCacheStorageEntry,
		listCacheStorage,
		readPersistedQueryCache,
		removePersistedQuery,
		unregisterServiceWorkers,
		type CacheStorageBucket
	} from '$lib/query/idbPersister';

	type QueryRow = {
		hash: string;
		label: string;
		status: string;
		updatedAt: string | null;
		bytes: number;
		dataJson: string;
	};

	let loading = $state(false);
	let working = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);
	let filter = $state('');
	let updatedAt = $state<string | null>(null);
	let totalBytes = $state(0);
	let queries = $state<QueryRow[]>([]);
	let buckets = $state<CacheStorageBucket[]>([]);
	let swScripts = $state<string[]>([]);
	let expanded = $state<string | null>(null);

	const filteredQueries = $derived.by(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return queries;
		return queries.filter(
			(row) =>
				row.label.toLowerCase().includes(q) ||
				row.hash.toLowerCase().includes(q) ||
				row.status.toLowerCase().includes(q)
		);
	});

	function asRecord(value: unknown): Record<string, unknown> | null {
		if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
		return value as Record<string, unknown>;
	}

	function formatKey(queryKey: unknown): string {
		if (Array.isArray(queryKey)) {
			return queryKey
				.map((part) =>
					typeof part === 'string' || typeof part === 'number' ? String(part) : JSON.stringify(part)
				)
				.join(' / ');
		}
		if (typeof queryKey === 'string') return queryKey;
		return JSON.stringify(queryKey ?? '(unknown)');
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function formatTime(value: unknown): string | null {
		if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
		return new Date(value).toLocaleString();
	}

	function parseQueries(raw: unknown): QueryRow[] {
		const rec = asRecord(raw);
		const clientState = rec ? asRecord(rec.clientState) : null;
		const rows = Array.isArray(clientState?.queries)
			? clientState.queries
			: Array.isArray(rec?.queries)
				? rec.queries
				: [];
		const parsed: QueryRow[] = [];
		for (const row of rows) {
			const query = asRecord(row);
			if (!query) continue;
			const state = asRecord(query.state);
			const dataJson = JSON.stringify(state?.data ?? null, null, 2);
			const hash =
				typeof query.queryHash === 'string' ? query.queryHash : JSON.stringify(query.queryKey);
			parsed.push({
				hash,
				label: formatKey(query.queryKey),
				status: typeof state?.status === 'string' ? state.status : 'unknown',
				updatedAt: formatTime(state?.dataUpdatedAt ?? rec?.timestamp),
				bytes: dataJson.length,
				dataJson
			});
		}
		parsed.sort((a, b) => a.label.localeCompare(b.label));
		return parsed;
	}

	async function loadAll() {
		if (!browser) return;
		loading = true;
		errorMessage = null;
		try {
			const raw = await readPersistedQueryCache();
			const rec = asRecord(raw);
			updatedAt = formatTime(rec?.timestamp);
			queries = parseQueries(raw);
			totalBytes = queries.reduce((sum, row) => sum + row.bytes, 0);
			buckets = await listCacheStorage();
			if ('serviceWorker' in navigator) {
				const regs = await navigator.serviceWorker.getRegistrations();
				swScripts = regs.map(
					(reg) => reg.active?.scriptURL ?? reg.installing?.scriptURL ?? '(no script)'
				);
			} else {
				swScripts = [];
			}
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to read caches.';
			queries = [];
			buckets = [];
		} finally {
			loading = false;
		}
	}

	async function copyText(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			successMessage = 'Copied to clipboard.';
		} catch {
			errorMessage = 'Could not copy.';
		}
	}

	async function dropQuery(hash: string) {
		working = true;
		errorMessage = null;
		successMessage = null;
		try {
			await removePersistedQuery(hash);
			if (expanded === hash) expanded = null;
			successMessage = 'Query removed from IndexedDB.';
			await loadAll();
		} catch {
			errorMessage = 'Could not remove that query.';
		} finally {
			working = false;
		}
	}

	async function wipeQueries() {
		if (!confirm('Delete the persisted TanStack Query cache in this browser?')) return;
		working = true;
		errorMessage = null;
		successMessage = null;
		try {
			await clearPersistedQueryCache();
			expanded = null;
			successMessage = 'Query cache cleared.';
			await loadAll();
		} catch {
			errorMessage = 'Could not clear the query cache.';
		} finally {
			working = false;
		}
	}

	async function dropSwCache(name: string) {
		working = true;
		errorMessage = null;
		successMessage = null;
		try {
			await deleteCacheStorage(name);
			successMessage = `Deleted cache “${name}”.`;
			await loadAll();
		} catch {
			errorMessage = 'Could not delete that cache.';
		} finally {
			working = false;
		}
	}

	async function dropSwEntry(name: string, url: string) {
		working = true;
		errorMessage = null;
		successMessage = null;
		try {
			await deleteCacheStorageEntry(name, url);
			successMessage = 'Removed cache entry.';
			await loadAll();
		} catch {
			errorMessage = 'Could not remove that entry.';
		} finally {
			working = false;
		}
	}

	async function wipeServiceWorkers() {
		if (!confirm('Clear article service-worker caches and unregister workers in this browser?')) {
			return;
		}
		working = true;
		errorMessage = null;
		successMessage = null;
		try {
			await clearArticlesServiceWorkerCaches();
			const leftover = await listCacheStorage();
			await Promise.all(leftover.map((bucket) => deleteCacheStorage(bucket.name)));
			await unregisterServiceWorkers();
			successMessage = 'Service workers unregistered and Cache Storage cleared.';
			await loadAll();
		} catch {
			errorMessage = 'Could not clear service-worker caches.';
		} finally {
			working = false;
		}
	}

	onMount(() => {
		void loadAll();
	});
</script>

<svelte:head>
	<title>Browser cache | itsMillerTime.dev</title>
</svelte:head>

<div class="admin-page">
	<div class="admin-page__head">
		<h1>Cache</h1>
		<div class="admin-actions">
			<button
				type="button"
				class="submit-btn secondary"
				disabled={loading}
				onclick={() => loadAll()}
			>
				{loading ? 'Reading…' : 'Refresh'}
			</button>
		</div>
	</div>
	{#if errorMessage}
		<p class="message error" role="alert">{errorMessage}</p>
	{/if}
	{#if successMessage}
		<p class="message success" role="status">{successMessage}</p>
	{/if}
	<section class="admin-block">
		<div class="admin-block__head">
			<h2>Query cache</h2>
			<p class="cache-meta">
				{QUERY_CACHE_STORAGE_KEY}
				{#if updatedAt}
					· {updatedAt}
				{/if}
				{#if queries.length > 0}
					· {queries.length}
					{queries.length === 1 ? 'query' : 'queries'} · {formatBytes(totalBytes)}
				{/if}
			</p>
			{#if queries.length > 0}
				<label class="field cache-filter">
					<span>Filter</span>
					<input type="search" bind:value={filter} placeholder="articles, layout, slug…" />
				</label>
			{/if}
			<div class="admin-actions">
				<button
					type="button"
					class="submit-btn"
					disabled={working || queries.length === 0}
					onclick={wipeQueries}
				>
					Clear queries
				</button>
			</div>
		</div>
		{#if loading && queries.length === 0}
			<p>Reading IndexedDB…</p>
		{:else if queries.length === 0}
			<p>Nothing persisted yet. Browse the public site so layout and content can be stored.</p>
		{:else if filteredQueries.length === 0}
			<p>No queries match that filter.</p>
		{:else}
			<div class="cache-table-wrap">
				<table class="cache-table">
					<thead>
						<tr>
							<th>Query</th>
							<th>Status</th>
							<th>Size</th>
							<th>Updated</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each filteredQueries as row (row.hash)}
							<tr>
								<td class="cache-table__query">
									<button
										type="button"
										class="cache-table__toggle"
										aria-expanded={expanded === row.hash}
										onclick={() => (expanded = expanded === row.hash ? null : row.hash)}
									>
										{row.label}
									</button>
								</td>
								<td class="cache-table__status">{row.status}</td>
								<td class="cache-table__num">{formatBytes(row.bytes)}</td>
								<td class="cache-table__num">{row.updatedAt ?? '—'}</td>
								<td class="cache-table__actions">
									<button
										type="button"
										class="submit-btn secondary"
										disabled={working}
										onclick={() => copyText(row.dataJson)}
									>
										Copy
									</button>
									<button
										type="button"
										class="submit-btn secondary"
										disabled={working}
										onclick={() => dropQuery(row.hash)}
									>
										Remove
									</button>
								</td>
							</tr>
							{#if expanded === row.hash}
								<tr class="cache-table__detail">
									<td colspan="5">
										<pre class="cache-json">{row.dataJson}</pre>
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
	<section class="admin-block">
		<div class="admin-block__head">
			<h2>Service worker</h2>
			<p class="cache-meta">
				{#if swScripts.length > 0}
					{swScripts.join(' · ')}
				{:else}
					No service worker registered in this browser.
				{/if}
			</p>
			<div class="admin-actions">
				<button
					type="button"
					class="submit-btn"
					disabled={working || (buckets.length === 0 && swScripts.length === 0)}
					onclick={wipeServiceWorkers}
				>
					Clear caches and unregister
				</button>
			</div>
		</div>
		{#if buckets.length === 0}
			<p>Cache Storage is empty.</p>
		{:else}
			{#each buckets as bucket (bucket.name)}
				<div class="cache-bucket">
					<div class="cache-bucket__head">
						<strong>{bucket.name}</strong>
						<span class="cache-meta">
							{bucket.entries.length}
							{bucket.entries.length === 1 ? 'entry' : 'entries'}
						</span>
						<button
							type="button"
							class="submit-btn secondary"
							disabled={working}
							onclick={() => dropSwCache(bucket.name)}
						>
							Delete cache
						</button>
					</div>
					<ul class="cache-sw-entries">
						{#each bucket.entries as entry (entry.url)}
							<li>
								<a href={entry.url} target="_blank" rel="noopener noreferrer">{entry.url}</a>
								<span class="cache-meta">
									{entry.status}
									{#if entry.size != null}
										· {formatBytes(entry.size)}
									{/if}
								</span>
								<button
									type="button"
									class="submit-btn secondary"
									disabled={working}
									onclick={() => dropSwEntry(bucket.name, entry.url)}
								>
									Remove
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		{/if}
	</section>
</div>
