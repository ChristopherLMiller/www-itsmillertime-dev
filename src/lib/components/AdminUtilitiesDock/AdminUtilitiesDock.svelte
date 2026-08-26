<script lang="ts">
	import { browser } from '$app/environment';
	import { invalidateAll, onNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { useQueryClient } from '@tanstack/svelte-query';
	import {
		clearArticlesServiceWorkerCaches,
		clearPersistedQueryCache,
		QUERY_CACHE_DB_NAME,
		QUERY_CACHE_STORE_NAME,
		readPersistedQueryCache
	} from '$lib/query/idbPersister';
	import { PUBLIC_PAYLOAD_URL, PUBLIC_URL } from '$env/static/public';
	import { currentReturnPath, hrefWithCallback } from '$lib/auth/returnTo';
	import { cubicOut } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { fade, fly } from 'svelte/transition';
	import hljs from 'highlight.js/lib/core';
	import json from 'highlight.js/lib/languages/json';
	import plaintext from 'highlight.js/lib/languages/plaintext';
	import 'highlight.js/styles/github-dark.min.css';

	hljs.registerLanguage('json', json);
	hljs.registerLanguage('plaintext', plaintext);

	type AdminTab = 'browser' | 'cms' | 'site';

	const TAB_ORDER: AdminTab[] = ['browser', 'cms', 'site'];

	const queryClient = useQueryClient();

	let user = $derived(page.data.session?.user ?? null);
	let isAdmin = $derived(!!user && (user?.role as string[] | undefined)?.includes('admin'));

	let panelOpen = $state(false);
	let activeTab = $state<AdminTab>('browser');
	let rootEl: HTMLDivElement | undefined = $state();
	/** True while a site lightbox / PhotoSwipe / modal dialog is open — hide the solo tab. */
	let overlayActive = $state(false);

	const cms = `${PUBLIC_PAYLOAD_URL}/admin`;
	const cmsCollections = {
		posts: `${cms}/collections/posts`,
		pages: `${cms}/collections/pages`,
		media: `${cms}/collections/media`,
		galleryAlbums: `${cms}/collections/gallery-albums`,
		galleryImages: `${cms}/collections/gallery-images`,
		users: `${cms}/collections/users`
	};

	let persistedCacheText = $state<string | null>(null);
	let persistedCacheLoading = $state(false);
	let persistedCacheError = $state<string | null>(null);
	let clearBusy = $state(false);
	let clearMsg = $state<string | null>(null);
	let copyFeedback = $state<'idle' | 'copied' | 'error'>('idle');
	let copyTimeoutId: ReturnType<typeof setTimeout> | undefined;

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

	async function loadPersistedCache() {
		if (!browser) return;
		persistedCacheLoading = true;
		persistedCacheError = null;
		try {
			const data = await readPersistedQueryCache();
			persistedCacheText = data == null ? null : JSON.stringify(data, null, 2);
		} catch (e) {
			persistedCacheError = e instanceof Error ? e.message : 'Failed to read IndexedDB';
			persistedCacheText = null;
		} finally {
			persistedCacheLoading = false;
		}
	}

	async function copyPersistedCache(e?: MouseEvent) {
		e?.stopPropagation();
		if (!browser || persistedCacheText == null) return;
		try {
			await navigator.clipboard.writeText(persistedCacheText);
			copyFeedback = 'copied';
		} catch {
			copyFeedback = 'error';
		}
		if (copyTimeoutId !== undefined) clearTimeout(copyTimeoutId);
		copyTimeoutId = setTimeout(() => {
			copyFeedback = 'idle';
			copyTimeoutId = undefined;
		}, 2000);
	}

	async function clearOfflineCache() {
		if (!browser) return;
		clearBusy = true;
		clearMsg = null;
		try {
			queryClient.clear();
			await clearPersistedQueryCache();
			await clearArticlesServiceWorkerCaches();
			await invalidateAll();
			clearMsg = 'Offline cache cleared; data reloaded.';
			await loadPersistedCache();
		} catch {
			clearMsg = 'Could not clear offline cache.';
		} finally {
			clearBusy = false;
		}
	}

	$effect(() => {
		if (!panelOpen || activeTab !== 'browser') return;
		untrack(() => {
			void loadPersistedCache();
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

	/** Hide the floating Admin tab while lightboxes/modals own the viewport. */
	$effect(() => {
		if (!browser) return;

		function isOverlayPresent() {
			return Boolean(
				document.querySelector(
					'.lightbox, .pswp, dialog[open], [aria-modal="true"]:not(.admin-dock-dialog)'
				)
			);
		}

		function syncOverlay() {
			const next = isOverlayPresent();
			if (next !== overlayActive) overlayActive = next;
			// Don't leave the admin sheet open on top of a lightbox.
			if (next && panelOpen) panelOpen = false;
		}

		syncOverlay();
		const mo = new MutationObserver(syncOverlay);
		mo.observe(document.documentElement, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['open', 'class', 'aria-modal']
		});
		return () => mo.disconnect();
	});

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
		{#if !panelOpen && !overlayActive}
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
		{:else if panelOpen}
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
						<div class="admin-dock-header">
							<h2 id="admin-dock-dialog-title" class="admin-dock-header__title">Admin tools</h2>
							<button
								type="button"
								class="admin-dock-close"
								onclick={(e) => {
									e.stopPropagation();
									closePanel();
								}}
								aria-label="Close admin tools"
							>
								<span aria-hidden="true">×</span>
							</button>
						</div>

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
								id="admin-panel-browser"
								class="admin-dock-panel"
								role="tabpanel"
								aria-labelledby="admin-tab-browser"
								hidden={activeTab !== 'browser'}
							>
								<p class="admin-dock-section-lead">
									Offline cache: the persisted TanStack Query store in IndexedDB (articles,
									projects, and layout globals) used for instant loads and offline support.
								</p>
								<p class="admin-dock-note admin-dock-idb-meta-line">
									<code class="admin-dock-idb-code-label">{QUERY_CACHE_DB_NAME}</code>
									·
									<code class="admin-dock-idb-code-label">{QUERY_CACHE_STORE_NAME}</code>
								</p>
								<div class="admin-dock-row">
									<button
										type="button"
										class="admin-dock-btn"
										disabled={persistedCacheLoading || !browser}
										onclick={() => loadPersistedCache()}
									>
										{persistedCacheLoading ? 'Loading…' : 'Refresh'}
									</button>
									<button
										type="button"
										class="admin-dock-btn"
										disabled={clearBusy || !browser}
										onclick={clearOfflineCache}
									>
										{clearBusy ? 'Clearing…' : 'Clear offline cache'}
									</button>
									{#if persistedCacheText != null}
										<button
											type="button"
											class="admin-dock-linkish"
											disabled={!browser}
											onclick={(e) => copyPersistedCache(e)}
										>
											{copyFeedback === 'copied'
												? 'Copied'
												: copyFeedback === 'error'
													? 'Copy failed'
													: 'Copy JSON'}
										</button>
									{/if}
								</div>
								{#if clearMsg}
									<p class="admin-dock-success">{clearMsg}</p>
								{/if}
								{#if persistedCacheError}
									<p class="admin-dock-error">{persistedCacheError}</p>
								{/if}
								{#if persistedCacheLoading && persistedCacheText == null && !persistedCacheError}
									<p class="admin-dock-note">Reading IndexedDB…</p>
								{:else if !persistedCacheLoading && persistedCacheText == null && !persistedCacheError}
									<p class="admin-dock-note">
										No persisted cache yet. Visit article, project, or any site page while online
										first so its data is cached for offline use.
									</p>
								{:else if persistedCacheText != null}
									<div
										class="admin-dock-peek-code-wrap admin-dock-idb-data-wrap"
										role="region"
										aria-label="Persisted query cache"
									>
										<pre class="admin-dock-peek-pre"><code class="hljs admin-dock-peek-code"
												>{@html highlightPeekHtml(persistedCacheText)}</code
											></pre>
									</div>
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
									<li>
										<a href={cmsCollections.galleryAlbums} target="_blank" rel="noreferrer"
											>Gallery albums</a
										>
									</li>
									<li>
										<a href={cmsCollections.galleryImages} target="_blank" rel="noreferrer"
											>Gallery images</a
										>
									</li>
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
									<li>
										<a
											href={hrefWithCallback(
												'/account/logout',
												currentReturnPath(page.url, ['/account/profile'])
											)}>Sign out</a
										>
									</li>
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
			max(0.75rem, env(safe-area-inset-right, 0px)) max(0.75rem, env(safe-area-inset-bottom, 0px))
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
		/* Shared caps for JSON/value code blocks (persisted cache view). */
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

	.admin-dock-header {
		display: flex;
		flex-shrink: 0;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 0.75rem 0.65rem 1.1rem;
		background: color-mix(
			in oklch,
			var(--color-tertiary-darkest) 75%,
			var(--color-secondary-darker)
		);
		border-bottom: 1px solid color-mix(in oklch, var(--color-tertiary) 45%, transparent);
	}

	.admin-dock-header__title {
		margin: 0;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--color-white-lighter);
	}

	.admin-dock-close {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		margin: 0;
		padding: 0;
		border: none;
		border-radius: 0.35rem;
		background: color-mix(in oklch, var(--color-tertiary) 35%, transparent);
		color: var(--color-white-lighter);
		font-family: var(--font-oswald);
		font-size: 1.75rem;
		line-height: 1;
		cursor: pointer;
		transition: background 150ms ease;
	}

	.admin-dock-close:hover {
		background: color-mix(in oklch, var(--color-primary) 55%, transparent);
	}

	.admin-dock-close:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
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

	/* Vertical tab above the footer version bar (avoids covering vX.Y.Z). */
	.admin-dock-tab--solo {
		position: fixed;
		right: 0;
		bottom: var(--chrome-corner-bottom);
		top: auto;
		z-index: 10003;
		pointer-events: auto;
		writing-mode: vertical-rl;
		text-orientation: mixed;
		min-width: auto;
		width: var(--admin-edge-tab-width);
		padding: 0.85rem 0;
		border-radius: 0.35rem 0 0 0.35rem;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		font-size: var(--fs-xs);
		box-sizing: border-box;
		transition: bottom 180ms ease;
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
		background: color-mix(
			in oklch,
			var(--color-tertiary-darkest) 65%,
			var(--color-secondary-darker)
		);
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

		&:disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
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
