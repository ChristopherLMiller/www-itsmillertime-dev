<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidate, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import {
		BROWSER_CACHE_DB_NAME,
		BROWSER_CACHE_SCHEMA_VERSION,
		BROWSER_CACHE_STORE_NAME,
		browserCache,
		LAYOUT_CACHE_KEY,
		type IdbCacheRow
	} from '$lib/cache/browserCache';
	import { PUBLIC_PAYLOAD_URL, PUBLIC_URL } from '$env/static/public';
	import { cubicOut } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import hljs from 'highlight.js/lib/core';
	import json from 'highlight.js/lib/languages/json';
	import plaintext from 'highlight.js/lib/languages/plaintext';
	import 'highlight.js/styles/github-dark.min.css';

	hljs.registerLanguage('json', json);
	hljs.registerLanguage('plaintext', plaintext);

	type AdminTab = 'upstash' | 'browser' | 'cms' | 'site';

	const TAB_ORDER: AdminTab[] = ['upstash', 'browser', 'cms', 'site'];

	let user = $derived(page.data.session?.user ?? null);
	let isAdmin = $derived(!!user && (user?.role as string[] | undefined)?.includes('admin'));

	let panelOpen = $state(false);
	let activeTab = $state<AdminTab>('upstash');
	let rootEl: HTMLDivElement | undefined = $state();

	const cms = `${PUBLIC_PAYLOAD_URL}/admin`;
	const cmsCollections = {
		posts: `${cms}/collections/posts`,
		pages: `${cms}/collections/pages`,
		media: `${cms}/collections/media`,
		galleryAlbums: `${cms}/collections/gallery-albums`,
		galleryImages: `${cms}/collections/gallery-images`,
		users: `${cms}/collections/users`
	};

	let cacheKeys = $state<{ key: string; ttl: number }[]>([]);
	let cacheNextCursor = $state<string | null>(null);
	let cacheHasMore = $state(false);
	let cacheLoading = $state(false);
	let cacheConfigured = $state(true);
	let cacheError = $state<string | null>(null);

	let peekKey = $state<string | null>(null);
	let peekText = $state<string | null>(null);
	let peekLoading = $state(false);
	let peekCopyFeedback = $state<'idle' | 'copied' | 'error'>('idle');

	let copyPeekTimeoutId: ReturnType<typeof setTimeout> | undefined;

	/** Pretty-print when possible so hljs JSON grammar matches; handle BOM and JSON-in-a-string. */
	function prettyJsonForPeek(raw: string): string | null {
		const trimmed = raw.trim().replace(/^\uFEFF/, '');
		if (!trimmed) return null;
		try {
			const v = JSON.parse(trimmed);
			if (v !== null && typeof v === 'object') {
				return JSON.stringify(v, null, 2);
			}
			if (typeof v === 'string') {
				const inner = v.trim();
				if (
					(inner.startsWith('{') && inner.endsWith('}')) ||
					(inner.startsWith('[') && inner.endsWith(']'))
				) {
					try {
						const innerParsed = JSON.parse(inner);
						if (innerParsed !== null && typeof innerParsed === 'object') {
							return JSON.stringify(innerParsed, null, 2);
						}
					} catch {
						/* keep as JSON string value */
					}
				}
				return JSON.stringify(v, null, 2);
			}
			return JSON.stringify(v, null, 2);
		} catch {
			return null;
		}
	}

	function highlightPeekHtml(text: string): string {
		const normalized = prettyJsonForPeek(text);
		const source = normalized ?? text;
		try {
			return hljs.highlight(source, { language: 'json', ignoreIllegals: true }).value;
		} catch {
			return hljs.highlight(text, { language: 'plaintext', ignoreIllegals: true }).value;
		}
	}

	let layoutClearBusy = $state(false);
	let layoutClearMsg = $state<string | null>(null);

	let idbEntries = $state<IdbCacheRow[]>([]);
	let idbLoading = $state(false);
	let idbError = $state<string | null>(null);
	let idbCopyFeedbackKey = $state<string | null>(null);
	let idbCopyTimeoutId: ReturnType<typeof setTimeout> | undefined;

	function stringifyIdbData(data: unknown): string {
		try {
			return JSON.stringify(data, null, 2);
		} catch {
			return String(data);
		}
	}

	function formatIdbCachedAt(ms: number): string {
		try {
			return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
		} catch {
			return String(ms);
		}
	}

	async function loadIdbEntries() {
		if (!browser) return;
		idbLoading = true;
		idbError = null;
		try {
			idbEntries = await browserCache.listAllEntries();
		} catch (e) {
			idbError = e instanceof Error ? e.message : 'Failed to read IndexedDB';
			idbEntries = [];
		} finally {
			idbLoading = false;
		}
	}

	async function copyIdbJson(key: string, json: string, e?: MouseEvent) {
		e?.stopPropagation();
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(json);
			idbCopyFeedbackKey = key;
			if (idbCopyTimeoutId !== undefined) clearTimeout(idbCopyTimeoutId);
			idbCopyTimeoutId = setTimeout(() => {
				idbCopyFeedbackKey = null;
				idbCopyTimeoutId = undefined;
			}, 2000);
		} catch {
			/* ignore */
		}
	}

	function formatTtl(ttl: number): string {
		if (ttl === -2) return '—';
		if (ttl === -1) return 'no expiry';
		if (ttl < 60) return `${ttl}s`;
		if (ttl < 3600) return `${Math.floor(ttl / 60)}m`;
		const h = Math.floor(ttl / 3600);
		const m = Math.floor((ttl % 3600) / 60);
		return `${h}h ${m}m`;
	}

	const UPSTASH_SCAN_COUNT = '200';
	const UPSTASH_MAX_PAGES = 500;

	/** Paginate SCAN until cursor returns to 0 (all keys matching the pattern). */
	async function loadAllUpstashKeys() {
		if (cacheLoading) return;
		cacheLoading = true;
		cacheError = null;
		try {
			cacheKeys = [];
			cacheNextCursor = null;
			peekKey = null;
			peekText = null;

			let cursor = '0';
			const match = '*';

			for (let page = 0; page < UPSTASH_MAX_PAGES; page++) {
				const q = new URLSearchParams({ cursor, match, count: UPSTASH_SCAN_COUNT });
				const res = await fetch(`/api/admin/upstash-cache?${q}`, { credentials: 'include' });
				const data = (await res.json()) as {
					configured?: boolean;
					error?: string;
					keys?: { key: string; ttl: number }[];
					nextCursor?: string;
				};
				if (!res.ok) {
					cacheConfigured = data.configured !== false;
					throw new Error(data.error || res.statusText);
				}
				cacheConfigured = true;
				const newKeys = data.keys ?? [];
				cacheKeys = [...cacheKeys, ...newKeys];
				const next = String(data.nextCursor ?? '0');
				cacheNextCursor = next;
				cacheHasMore = next !== '0';
				if (next === '0') break;
				cursor = next;
			}
		} catch (e) {
			cacheError = e instanceof Error ? e.message : 'Failed to load';
		} finally {
			cacheLoading = false;
		}
	}

	// Only react to panelOpen + activeTab. Do not track reads inside loadAllUpstashKeys (e.g. cacheLoading),
	// or the effect re-runs when loading finishes and would refetch in a tight loop (and hammer layout/session).
	$effect(() => {
		if (!panelOpen || activeTab !== 'upstash') return;
		untrack(() => {
			void loadAllUpstashKeys();
		});
	});

	$effect(() => {
		peekKey;
		peekText;
		peekCopyFeedback = 'idle';
		if (copyPeekTimeoutId !== undefined) {
			clearTimeout(copyPeekTimeoutId);
			copyPeekTimeoutId = undefined;
		}
	});

	$effect(() => {
		if (!panelOpen || activeTab !== 'browser') return;
		untrack(() => {
			void loadIdbEntries();
		});
	});

	/** Lock page scroll while the admin sheet is open (prevents scroll chaining to the site behind). */
	$effect(() => {
		if (!browser) return;
		if (!panelOpen) return;
		const html = document.documentElement;
		const body = document.body;
		const prevHtml = html.style.overflow;
		const prevBody = body.style.overflow;
		html.style.overflow = 'hidden';
		body.style.overflow = 'hidden';
		return () => {
			html.style.overflow = prevHtml;
			body.style.overflow = prevBody;
		};
	});

	async function doPeek(key: string) {
		if (peekKey === key && peekText !== null) {
			peekKey = null;
			peekText = null;
			return;
		}
		peekLoading = true;
		cacheError = null;
		try {
			const res = await fetch('/api/admin/upstash-cache', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'peek', key })
			});
			const data = (await res.json()) as { error?: string; preview?: string };
			if (!res.ok) throw new Error(data.error || res.statusText);
			peekKey = key;
			peekText = data.preview ?? '';
		} catch (e) {
			cacheError = e instanceof Error ? e.message : 'Peek failed';
		} finally {
			peekLoading = false;
		}
	}

	async function copyPeekValue(raw: string, e?: MouseEvent) {
		e?.stopPropagation();
		if (!browser) return;
		try {
			await navigator.clipboard.writeText(raw);
			peekCopyFeedback = 'copied';
			if (copyPeekTimeoutId !== undefined) clearTimeout(copyPeekTimeoutId);
			copyPeekTimeoutId = setTimeout(() => {
				peekCopyFeedback = 'idle';
				copyPeekTimeoutId = undefined;
			}, 2000);
		} catch {
			peekCopyFeedback = 'error';
			if (copyPeekTimeoutId !== undefined) clearTimeout(copyPeekTimeoutId);
			copyPeekTimeoutId = setTimeout(() => {
				peekCopyFeedback = 'idle';
				copyPeekTimeoutId = undefined;
			}, 2500);
		}
	}

	async function doDelete(key: string) {
		if (!confirm(`Delete this Upstash cache key?\n\n${key}`)) return;
		cacheError = null;
		try {
			const res = await fetch('/api/admin/upstash-cache', {
				method: 'POST',
				credentials: 'include',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'delete', key })
			});
			const data = (await res.json()) as { error?: string };
			if (!res.ok) throw new Error(data.error || res.statusText);
			await loadAllUpstashKeys();
			if (peekKey === key) {
				peekKey = null;
				peekText = null;
			}
		} catch (e) {
			cacheError = e instanceof Error ? e.message : 'Delete failed';
		}
	}

	async function clearLayoutBrowserCache() {
		if (!browser) return;
		layoutClearBusy = true;
		layoutClearMsg = null;
		try {
			await browserCache.clear(LAYOUT_CACHE_KEY);
			await invalidate('app:layout');
			layoutClearMsg = 'IndexedDB layout cache cleared; layout reloaded.';
			await loadIdbEntries();
		} catch {
			layoutClearMsg = 'Could not clear browser cache.';
		} finally {
			layoutClearBusy = false;
		}
	}

	function closePanel() {
		panelOpen = false;
	}

	function togglePanel() {
		panelOpen = !panelOpen;
	}

	function setTab(tab: AdminTab) {
		activeTab = tab;
	}

	function handleTablistKeydown(e: KeyboardEvent) {
		const idx = TAB_ORDER.indexOf(activeTab);
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			activeTab = TAB_ORDER[(idx + 1) % TAB_ORDER.length];
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			activeTab = TAB_ORDER[(idx + TAB_ORDER.length - 1) % TAB_ORDER.length];
		} else if (e.key === 'Home') {
			e.preventDefault();
			activeTab = TAB_ORDER[0];
		} else if (e.key === 'End') {
			e.preventDefault();
			activeTab = TAB_ORDER[TAB_ORDER.length - 1];
		}
	}

	function handleDocumentClick(e: MouseEvent) {
		if (!panelOpen || !rootEl) return;
		const target = e.target as Node;
		if (!rootEl.contains(target)) closePanel();
	}

	function handleDocumentKeydown(e: KeyboardEvent) {
		if (!panelOpen) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			closePanel();
		}
	}

	onNavigate(() => {
		closePanel();
	});
</script>

<svelte:window onclick={handleDocumentClick} onkeydown={handleDocumentKeydown} />

{#if isAdmin}
	<div class="admin-dock-root" bind:this={rootEl}>
		{#if !panelOpen}
			<button
				type="button"
				class="admin-dock-tab admin-dock-tab--solo"
				onclick={(e) => {
					e.stopPropagation();
					togglePanel();
				}}
				aria-expanded={panelOpen}
				aria-controls="admin-dock-dialog"
				aria-haspopup="dialog"
			>
				<span class="admin-dock-label">Admin</span>
			</button>
		{:else}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="admin-dock-backdrop"
				transition:fade={{ duration: 180 }}
				onclick={closePanel}
				role="presentation"
			></div>
			<div class="admin-dock-dialog-shell">
				<div
					class="admin-dock-slide"
					transition:fly={{ x: '100%', duration: 340, opacity: 1, easing: cubicOut }}
				>
					<div
						class="admin-dock-dialog"
						id="admin-dock-dialog"
						role="dialog"
						aria-modal="true"
						aria-labelledby="admin-dock-dialog-title"
					>
						<h2 id="admin-dock-dialog-title" class="admin-dock-sr-only">Admin tools</h2>

				<div
					class="admin-dock-tablist"
					role="tablist"
					aria-label="Admin tool sections"
					tabindex="-1"
					onkeydown={handleTablistKeydown}
				>
					<button
						type="button"
						class="admin-dock-tab-btn"
						class:admin-dock-tab-btn--active={activeTab === 'upstash'}
						role="tab"
						id="admin-tab-upstash"
						aria-selected={activeTab === 'upstash'}
						aria-controls="admin-panel-upstash"
						tabindex={activeTab === 'upstash' ? 0 : -1}
						onclick={() => setTab('upstash')}
					>
						Upstash
					</button>
					<button
						type="button"
						class="admin-dock-tab-btn"
						class:admin-dock-tab-btn--active={activeTab === 'browser'}
						role="tab"
						id="admin-tab-browser"
						aria-selected={activeTab === 'browser'}
						aria-controls="admin-panel-browser"
						tabindex={activeTab === 'browser' ? 0 : -1}
						onclick={() => setTab('browser')}
					>
						Browser
					</button>
					<button
						type="button"
						class="admin-dock-tab-btn"
						class:admin-dock-tab-btn--active={activeTab === 'cms'}
						role="tab"
						id="admin-tab-cms"
						aria-selected={activeTab === 'cms'}
						aria-controls="admin-panel-cms"
						tabindex={activeTab === 'cms' ? 0 : -1}
						onclick={() => setTab('cms')}
					>
						CMS
					</button>
					<button
						type="button"
						class="admin-dock-tab-btn"
						class:admin-dock-tab-btn--active={activeTab === 'site'}
						role="tab"
						id="admin-tab-site"
						aria-selected={activeTab === 'site'}
						aria-controls="admin-panel-site"
						tabindex={activeTab === 'site' ? 0 : -1}
						onclick={() => setTab('site')}
					>
						Site
					</button>
				</div>

				<div class="admin-dock-panels">
					<div
						id="admin-panel-upstash"
						class="admin-dock-panel"
						role="tabpanel"
						aria-labelledby="admin-tab-upstash"
						hidden={activeTab !== 'upstash'}
					>
						<p class="admin-dock-section-lead">
							All keys in Upstash Redis (SCAN until complete). Use Refresh to reload after changes.
						</p>
						{#if !cacheConfigured}
							<p class="admin-dock-note">
								Redis env vars are not set on this server, so listing keys is unavailable.
							</p>
						{:else}
							<div class="admin-dock-row">
								<button
									type="button"
									class="admin-dock-btn"
									disabled={cacheLoading}
									onclick={() => loadAllUpstashKeys()}
								>
									{cacheLoading ? 'Loading…' : 'Refresh'}
								</button>
								{#if cacheHasMore}
									<span class="admin-dock-scan-cap" title="SCAN safety limit reached"
										>Partial list (limit)</span
									>
								{/if}
							</div>
							{#if cacheError}
								<p class="admin-dock-error">{cacheError}</p>
							{/if}
							{#if cacheKeys.length > 0}
								<ul class="admin-dock-cache-list">
									{#each cacheKeys as row (row.key)}
										<li class="admin-dock-cache-row">
											<div class="admin-dock-cache-line">
												<div class="admin-dock-cache-left">
													<span class="admin-dock-cache-ttl">{formatTtl(row.ttl)}</span>
													<span class="admin-dock-cache-key" title={row.key}>{row.key}</span>
												</div>
												<div class="admin-dock-cache-actions">
													<button
														type="button"
														class="admin-dock-linkish"
														disabled={peekLoading}
														onclick={(e) => {
															e.stopPropagation();
															void doPeek(row.key);
														}}
													>
														{peekKey === row.key ? 'Hide value' : 'Expand value'}
													</button>
													<button
														type="button"
														class="admin-dock-linkish danger"
														onclick={(e) => {
															e.stopPropagation();
															void doDelete(row.key);
														}}
													>
														Delete
													</button>
												</div>
											</div>
											{#if peekKey === row.key && peekText !== null}
												<div class="admin-dock-peek">
													<div class="admin-dock-peek-toolbar">
														<button
															type="button"
															class="admin-dock-linkish"
															disabled={!browser}
															onclick={(e) => {
																e.stopPropagation();
																if (peekText !== null) void copyPeekValue(peekText, e);
															}}
														>
															{peekCopyFeedback === 'copied'
																? 'Copied'
																: peekCopyFeedback === 'error'
																	? 'Copy failed'
																	: 'Copy value'}
														</button>
													</div>
													<div
														class="admin-dock-peek-code-wrap"
														role="region"
														aria-label="Cached value"
													>
														<pre class="admin-dock-peek-pre"><code class="hljs admin-dock-peek-code"
															>{@html highlightPeekHtml(peekText)}</code
														></pre>
													</div>
												</div>
											{/if}
										</li>
									{/each}
								</ul>
							{/if}
						{/if}
					</div>

					<div
						id="admin-panel-browser"
						class="admin-dock-panel"
						role="tabpanel"
						aria-labelledby="admin-tab-browser"
						hidden={activeTab !== 'browser'}
					>
						<p class="admin-dock-section-lead">
							Client-side IndexedDB used for instant layout navigations.
						</p>
						<p class="admin-dock-note admin-dock-idb-meta-line">
							<code class="admin-dock-idb-code-label">{BROWSER_CACHE_DB_NAME}</code>
							·
							<code class="admin-dock-idb-code-label">{BROWSER_CACHE_STORE_NAME}</code>
						</p>
						<div class="admin-dock-row">
							<button
								type="button"
								class="admin-dock-btn"
								disabled={idbLoading || !browser}
								onclick={() => loadIdbEntries()}
							>
								{idbLoading ? 'Loading…' : 'Refresh'}
							</button>
							<button
								type="button"
								class="admin-dock-btn"
								disabled={layoutClearBusy || !browser}
								onclick={clearLayoutBrowserCache}
							>
								{layoutClearBusy ? 'Clearing…' : 'Clear layout cache'}
							</button>
						</div>
						{#if layoutClearMsg}
							<p class="admin-dock-success">{layoutClearMsg}</p>
						{/if}
						{#if idbError}
							<p class="admin-dock-error">{idbError}</p>
						{/if}
						{#if idbLoading && idbEntries.length === 0 && !idbError}
							<p class="admin-dock-note">Reading IndexedDB…</p>
						{:else if !idbLoading && idbEntries.length === 0 && !idbError}
							<p class="admin-dock-note">No entries in this store.</p>
						{:else if idbEntries.length > 0}
							<ul class="admin-dock-idb-list">
								{#each idbEntries as row (row.key)}
									<li class="admin-dock-idb-entry">
										<div class="admin-dock-idb-entry-head">
											<span class="admin-dock-idb-key" title={row.key}>{row.key}</span>
											<div class="admin-dock-idb-head-right">
												<span class="admin-dock-cache-ttl">{formatIdbCachedAt(row.cachedAt)}</span>
												{#if row.schemaVersion !== BROWSER_CACHE_SCHEMA_VERSION}
													<span class="admin-dock-idb-stale" title="Entry does not match current schema; ignored by reads"
														>schema v{row.schemaVersion}</span
													>
												{/if}
												<button
													type="button"
													class="admin-dock-linkish"
													disabled={!browser}
													onclick={(e) => {
														e.stopPropagation();
														void copyIdbJson(row.key, stringifyIdbData(row.data), e);
													}}
												>
													{idbCopyFeedbackKey === row.key ? 'Copied' : 'Copy JSON'}
												</button>
											</div>
										</div>
										<div
											class="admin-dock-peek-code-wrap admin-dock-idb-data-wrap"
											role="region"
											aria-label="Entry payload for {row.key}"
										>
											<pre class="admin-dock-peek-pre"><code class="hljs admin-dock-peek-code"
												>{@html highlightPeekHtml(stringifyIdbData(row.data))}</code
											></pre>
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</div>

					<div
						id="admin-panel-cms"
						class="admin-dock-panel"
						role="tabpanel"
						aria-labelledby="admin-tab-cms"
						hidden={activeTab !== 'cms'}
					>
						<p class="admin-dock-section-lead">Opens Payload admin in a new tab.</p>
						<ul class="admin-dock-links">
							<li><a href={cms} target="_blank" rel="noreferrer">Dashboard</a></li>
							<li><a href={cmsCollections.posts} target="_blank" rel="noreferrer">Posts</a></li>
							<li><a href={cmsCollections.pages} target="_blank" rel="noreferrer">Pages</a></li>
							<li><a href={cmsCollections.media} target="_blank" rel="noreferrer">Media</a></li>
							<li><a href={cmsCollections.galleryAlbums} target="_blank" rel="noreferrer">Gallery albums</a></li>
							<li><a href={cmsCollections.galleryImages} target="_blank" rel="noreferrer">Gallery images</a></li>
							<li><a href={cmsCollections.users} target="_blank" rel="noreferrer">Users</a></li>
						</ul>
					</div>

					<div
						id="admin-panel-site"
						class="admin-dock-panel"
						role="tabpanel"
						aria-labelledby="admin-tab-site"
						hidden={activeTab !== 'site'}
					>
						<p class="admin-dock-section-lead">This site and SEO endpoints.</p>
						<ul class="admin-dock-links">
							<li><a href="/account/profile">Profile</a></li>
							<li><a href="/account/logout">Sign out</a></li>
							<li><a href="{PUBLIC_URL}/sitemap.xml">Sitemap</a></li>
							<li><a href="{PUBLIC_URL}/robots.txt">robots.txt</a></li>
						</ul>
					</div>
				</div>
				</div>
					<button
						type="button"
						class="admin-dock-tab admin-dock-tab--attached"
						onclick={(e) => {
							e.stopPropagation();
							togglePanel();
						}}
						aria-expanded={panelOpen}
						aria-controls="admin-dock-dialog"
					>
						<span class="admin-dock-label">Admin</span>
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}

<style lang="postcss">
	/*
	 * Root covers the viewport with no transform, so `position: fixed` on the backdrop and dialog
	 * uses the viewport as the containing block (a transformed ancestor would shrink them to ~0 width).
	 */
	.admin-dock-root {
		position: fixed;
		inset: 0;
		z-index: 10000;
		pointer-events: none;
	}

	.admin-dock-root > .admin-dock-tab--solo {
		pointer-events: auto;
	}

	.admin-dock-backdrop {
		position: fixed;
		inset: 0;
		z-index: 9998;
		pointer-events: auto;
		margin: 0;
		border: none;
		padding: 0;
		background: color-mix(in oklch, var(--color-tertiary-darkest) 55%, transparent);
		backdrop-filter: blur(2px);
		overscroll-behavior: contain;
	}

	.admin-dock-dialog-shell {
		position: fixed;
		inset: 0;
		z-index: 10001;
		display: flex;
		box-sizing: border-box;
		align-items: center;
		justify-content: center;
		padding: max(0.75rem, env(safe-area-inset-top, 0px))
			max(0.75rem, env(safe-area-inset-right, 0px))
			max(0.75rem, env(safe-area-inset-bottom, 0px))
			max(0.75rem, env(safe-area-inset-left, 0px));
		pointer-events: none;
		overscroll-behavior: contain;
	}

	.admin-dock-dialog-shell .admin-dock-slide {
		pointer-events: auto;
	}

	.admin-dock-slide {
		display: flex;
		flex-direction: row-reverse;
		align-items: stretch;
		flex-shrink: 0;
		box-sizing: border-box;
		width: min(96vw, 1400px, calc(100vw - 1.5rem));
		max-width: calc(100vw - 1.5rem);
	}

	.admin-dock-dialog {
		/* Shared caps for JSON/value code blocks (Upstash peek + IndexedDB). */
		--admin-dock-code-max-h: min(48vh, 30rem);
		--admin-dock-idb-code-max-h: min(52vh, 32rem);

		position: relative;
		display: flex;
		flex-direction: column;
		flex: 1 1 auto;
		min-width: 0;
		box-sizing: border-box;
		height: min(92vh, 56rem);
		overflow: hidden;
		overscroll-behavior: contain;
		background: var(--color-secondary-darker);
		color: var(--color-white-lighter);
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		line-height: var(--line-height);
		box-shadow: var(--box-shadow-elev-2);
		border-radius: 0.45rem;
		border: 1px solid color-mix(in oklch, var(--color-tertiary) 40%, transparent);
	}

	.admin-dock-sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.admin-dock-tab {
		cursor: pointer;
		border: none;
		padding: 0.75rem 0.35rem;
		min-width: 2.25rem;
		background: var(--color-tertiary-darker);
		color: var(--color-white-lighter);
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		line-height: var(--line-height);
		font-weight: 500;
		letter-spacing: 0.06em;
		box-shadow: var(--box-shadow-elev-1);
		border-radius: 0.35rem 0 0 0.35rem;
		writing-mode: vertical-rl;
		text-orientation: mixed;
	}

	.admin-dock-tab--solo {
		position: fixed;
		right: max(0px, env(safe-area-inset-right, 0px));
		top: 50%;
		transform: translateY(-50%);
		z-index: 10003;
		pointer-events: auto;
	}

	.admin-dock-tab--attached {
		position: relative;
		flex: 0 0 auto;
		align-self: stretch;
		z-index: 1;
	}

	.admin-dock-tab:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.admin-dock-label {
		display: block;
	}

	.admin-dock-tablist {
		display: flex;
		flex-shrink: 0;
		flex-wrap: nowrap;
		gap: 0;
		border-bottom: 1px solid color-mix(in oklch, var(--color-tertiary) 50%, transparent);
		background: color-mix(in oklch, var(--color-tertiary-darkest) 65%, var(--color-secondary-darker));
	}

	.admin-dock-tab-btn {
		flex: 1;
		min-width: 0;
		cursor: pointer;
		border: none;
		padding: 0.65rem 0.5rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		line-height: var(--line-height);
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: color-mix(in oklch, var(--color-white-lighter) 75%, transparent);
		background: transparent;
		border-bottom: 2px solid transparent;
		margin-bottom: -1px;
		transition:
			color 0.15s ease,
			border-color 0.15s ease,
			background 0.15s ease;

		&:hover {
			color: var(--color-white-lighter);
			background: color-mix(in oklch, var(--color-tertiary) 25%, transparent);
		}

		&:focus-visible {
			outline: 2px solid var(--color-secondary);
			outline-offset: -2px;
		}
	}

	.admin-dock-tab-btn--active {
		color: var(--color-white-lighter);
		border-bottom-color: var(--color-secondary);
		background: color-mix(in oklch, var(--color-secondary-darker) 80%, transparent);
	}

	.admin-dock-panels {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.admin-dock-panel {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: 1rem 1.25rem 1.25rem;
	}

	.admin-dock-panel[hidden] {
		display: none;
	}

	.admin-dock-section-lead {
		margin: 0 0 0.75rem;
		font-size: var(--fs-base);
		line-height: var(--line-height);
		font-weight: 400;
		opacity: 0.9;
	}

	.admin-dock-note {
		margin: 0 0 0.5rem;
		font-size: var(--fs-base);
		line-height: var(--line-height);
		font-weight: 400;
		opacity: 0.92;
	}

	.admin-dock-error {
		margin: 0.35rem 0 0;
		font-size: var(--fs-base);
		line-height: var(--line-height);
		color: var(--color-primary-lighter);
	}

	.admin-dock-success {
		margin: 0.35rem 0 0;
		font-size: var(--fs-base);
		line-height: var(--line-height);
		color: var(--color-secondary-lightest);
	}

	.admin-dock-idb-meta-line {
		margin: 0 0 0.65rem;
		font-size: var(--fs-xs);
		opacity: 0.92;
	}

	.admin-dock-idb-code-label {
		font-family: var(--font-source-code-pro);
		font-size: 0.95em;
		padding: 0.05em 0.3em;
		border-radius: 0.15rem;
		background: color-mix(in oklch, var(--color-tertiary-darkest) 80%, transparent);
	}

	.admin-dock-idb-list {
		margin: 0.5rem 0 0;
		padding: 0;
		list-style: none;
	}

	.admin-dock-idb-entry {
		margin-top: 0.65rem;
		padding-top: 0.65rem;
		border-top: 1px solid color-mix(in oklch, var(--color-tertiary) 45%, transparent);
	}

	.admin-dock-idb-entry:first-child {
		margin-top: 0.35rem;
		padding-top: 0;
		border-top: none;
	}

	.admin-dock-idb-entry-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.5rem;
		margin-bottom: 0.35rem;
		min-width: 0;
	}

	.admin-dock-idb-key {
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-base);
		line-height: var(--line-height);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		text-align: left;
	}

	.admin-dock-idb-head-right {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: flex-end;
		gap: 0.35rem 0.55rem;
		flex-shrink: 0;
	}

	.admin-dock-idb-stale {
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		line-height: 1.25;
		color: var(--color-primary-lighter);
		opacity: 0.95;
	}

	.admin-dock-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.45rem;
	}

	.admin-dock-btn {
		cursor: pointer;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		line-height: var(--line-height);
		font-weight: 500;
		padding: 0.45rem 0.85rem;
		border: none;
		border-radius: 0.25rem;
		background: var(--color-tertiary-darker);
		color: var(--color-white-lighter);
		box-shadow: var(--box-shadow-elev-0);

		&:disabled {
			opacity: 0.55;
			cursor: not-allowed;
		}

		&:not(:disabled):hover {
			background: var(--color-tertiary-darkest);
		}
	}

	.admin-dock-cache-list {
		margin: 0.35rem 0 0;
		padding: 0;
		list-style: none;
		border-top: 1px solid var(--color-tertiary);
	}

	.admin-dock-cache-row {
		padding: 0.4rem 0;
		border-bottom: 1px solid color-mix(in oklch, var(--color-tertiary) 55%, transparent);
	}

	.admin-dock-cache-line {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.65rem;
		width: 100%;
		min-width: 0;
	}

	.admin-dock-cache-left {
		display: flex;
		align-items: baseline;
		gap: 0.55rem;
		flex: 1;
		min-width: 0;
	}

	.admin-dock-cache-key {
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-base);
		line-height: var(--line-height);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		flex: 1;
		min-width: 0;
		text-align: left;
		color: var(--color-white-lighter);
		font-weight: 400;
	}

	.admin-dock-scan-cap {
		font-size: var(--fs-xs);
		line-height: var(--line-height);
		opacity: 0.85;
		align-self: center;
	}

	.admin-dock-cache-ttl {
		flex-shrink: 0;
		white-space: nowrap;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		line-height: var(--line-height);
		font-weight: 500;
		letter-spacing: 0.03em;
		font-variant-numeric: tabular-nums;
		color: color-mix(in oklch, var(--color-white-lighter) 72%, var(--color-secondary-lightest) 28%);
		padding: 0.1rem 0.45rem;
		border-radius: 0.25rem;
		background: color-mix(in oklch, var(--color-tertiary-darkest) 65%, var(--color-tertiary) 35%);
		border: 1px solid color-mix(in oklch, var(--color-tertiary) 50%, transparent);
		box-shadow: inset 0 1px 0 color-mix(in oklch, var(--color-white-lighter) 8%, transparent);
	}

	.admin-dock-cache-actions {
		display: flex;
		flex-wrap: nowrap;
		justify-content: flex-end;
		align-items: baseline;
		gap: 0.45rem 0.65rem;
		flex-shrink: 0;
	}

	.admin-dock-cache-row .admin-dock-peek {
		margin-top: 0.35rem;
	}

	.admin-dock-linkish {
		cursor: pointer;
		padding: 0;
		border: none;
		background: none;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		line-height: var(--line-height);
		color: var(--color-white-lighter);
		text-decoration: underline;

		&:hover,
		&:focus-visible {
			color: var(--color-primary-lighter);
		}

		&:focus-visible {
			outline: 2px solid var(--color-secondary);
			outline-offset: 2px;
		}

		&.danger {
			color: var(--color-primary-lighter);
		}

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}

	.admin-dock-peek {
		margin-top: 0.5rem;
		padding: 0.45rem;
		border-radius: 0.25rem;
		background: var(--color-tertiary-darkest);
		border: 1px solid var(--color-tertiary);
	}

	.admin-dock-peek-toolbar {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.35rem;
	}

	.admin-dock-peek-code-wrap {
		border-radius: 0.25rem;
		border: 1px solid color-mix(in oklch, var(--color-tertiary) 70%, transparent);
		background: #0d1117;
		overflow: auto;
		max-height: var(--admin-dock-code-max-h);
		overscroll-behavior: contain;
	}

	.admin-dock-peek-code-wrap.admin-dock-idb-data-wrap {
		max-height: var(--admin-dock-idb-code-max-h);
	}

	/* After the rules above so it wins: single IndexedDB row uses most of the viewport. */
	.admin-dock-idb-list:has(> .admin-dock-idb-entry:only-child)
		.admin-dock-peek-code-wrap.admin-dock-idb-data-wrap {
		max-height: min(56vh, 36rem);
	}

	.admin-dock-peek-pre {
		margin: 0;
		padding: 0.5rem 0.6rem;
		overflow: visible;
		font-family: var(--font-source-code-pro);
		font-size: var(--fs-base);
		line-height: 1.45;
		white-space: pre-wrap;
		word-break: break-word;
	}

	.admin-dock-peek-code {
		display: block;
		width: 100%;
		overflow: visible;
		font-family: inherit;
		font-size: inherit;
		line-height: inherit;
	}

	/*
	 * Pierced for hljs: scoped dialog `color` must not flatten token colors on injected @html spans.
	 */
	.admin-dock-peek-code-wrap :global(.hljs) {
		background: transparent;
		color: #c9d1d9;
	}

	.admin-dock-peek-code-wrap :global(.hljs-attr) {
		color: #79c0ff;
	}

	.admin-dock-peek-code-wrap :global(.hljs-string) {
		color: #a5d6ff;
	}

	.admin-dock-peek-code-wrap :global(.hljs-number) {
		color: #79c0ff;
	}

	.admin-dock-peek-code-wrap :global(.hljs-literal) {
		color: #79c0ff;
	}

	.admin-dock-peek-code-wrap :global(.hljs-punctuation) {
		color: #c9d1d9;
	}

	.admin-dock-peek-code-wrap :global(.hljs-comment) {
		color: #8b949e;
	}

	.admin-dock-links {
		margin: 0;
		padding: 0;
		list-style: none;

		li + li {
			margin-top: 0.45rem;
		}

		a {
			font-size: var(--fs-base);
			line-height: var(--line-height);
			color: var(--color-white-lighter);
			text-decoration: none;
			font-weight: 400;

			&:hover,
			&:focus-visible {
				color: var(--color-primary-lighter);
				text-decoration: underline;
			}

			&:focus-visible {
				outline: 2px solid var(--color-secondary);
				outline-offset: 2px;
			}
		}
	}
</style>
