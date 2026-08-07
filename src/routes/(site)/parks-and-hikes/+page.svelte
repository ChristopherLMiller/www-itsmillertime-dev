<script lang="ts">
	import { onMount } from 'svelte';
	import type { PageData } from './$types';
	import type { GalleryAlbum, MapMarker } from '$lib/types/payload-types';

	let { data }: { data: PageData } = $props();
	let mapContainer: HTMLDivElement;

	const placeCount = $derived(data.mapMarkers.length);
	const totalVisits = $derived(
		data.mapMarkers.reduce((sum, m) => sum + (m.visits ?? 0), 0)
	);
	const ratedMarkers = $derived(
		data.mapMarkers.filter((m) => m.rating != null && !Number.isNaN(m.rating))
	);
	const avgRating = $derived(
		ratedMarkers.length
			? ratedMarkers.reduce((sum, m) => sum + (m.rating ?? 0), 0) / ratedMarkers.length
			: null
	);
	const linkedCount = $derived(
		data.mapMarkers.filter((m) =>
			m.links?.some((link) => {
				if (link.url) return true;
				if (link.album && typeof link.album.value === 'object') {
					return Boolean((link.album.value as GalleryAlbum).slug);
				}
				return false;
			})
		).length
	);
	const avgRatingLabel = $derived(
		avgRating != null ? (Math.round(avgRating * 10) / 10).toFixed(1) : null
	);
	const topRated = $derived.by(() => {
		let best: MapMarker | null = null;
		for (const m of data.mapMarkers) {
			if (m.rating == null) continue;
			if (!best || (best.rating ?? 0) < m.rating) best = m;
		}
		return best;
	});

	function escapeHtml(value: string): string {
		return value
			.replaceAll('&', '&amp;')
			.replaceAll('<', '&lt;')
			.replaceAll('>', '&gt;')
			.replaceAll('"', '&quot;')
			.replaceAll("'", '&#39;');
	}

	function generateStars(rating: number | null | undefined): string {
		if (rating == null || Number.isNaN(rating)) return '';
		const full = Math.floor(rating);
		const half = rating % 1 >= 0.5;
		const empty = Math.max(0, 5 - full - (half ? 1 : 0));
		return `${'★'.repeat(full)}${half ? '½' : ''}${'☆'.repeat(empty)}`;
	}

	function buildLinksHtml(marker: MapMarker): string {
		if (!marker.links?.length) return '';

		const links = marker.links
			.map((link) => {
				if (link.url) {
					return `<a class="trail-popup__link" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.title)}</a>`;
				}
				if (link.album) {
					const album =
						typeof link.album.value === 'object' ? (link.album.value as GalleryAlbum) : null;
					if (album?.slug) {
						return `<a class="trail-popup__link" href="/galleries/${escapeHtml(album.slug)}">${escapeHtml(link.title)}</a>`;
					}
				}
				return '';
			})
			.filter(Boolean);

		if (!links.length) return '';
		return `<div class="trail-popup__links">${links.join('')}</div>`;
	}

	function createPinElement(title: string): HTMLButtonElement {
		const el = document.createElement('button');
		el.type = 'button';
		el.className = 'trail-pin';
		el.setAttribute('aria-label', `${title} — open details`);
		// Keep transforms off this root — MapLibre positions markers via `transform`.
		// viewBox tip sits on y=40 so anchor:"bottom" lands on the true point.
		el.innerHTML = `
			<span class="trail-pin__lift">
				<svg class="trail-pin__glyph" viewBox="0 0 36 40" width="36" height="40" aria-hidden="true">
					<path
						class="trail-pin__body"
						d="M18 39.75C18 39.75 5.25 24.2 5.25 14.4 5.25 7.35 11 1.75 18 1.75s12.75 5.6 12.75 12.65C30.75 24.2 18 39.75 18 39.75Z"
					/>
					<circle class="trail-pin__rim" cx="18" cy="14.4" r="7" />
					<circle class="trail-pin__face" cx="18" cy="14.4" r="5" />
					<circle class="trail-pin__glint" cx="15.9" cy="12.3" r="1.2" />
				</svg>
			</span>
		`;
		return el;
	}

	onMount(() => {
		let disposed = false;
		let map: import('maplibre-gl').Map | null = null;
		let ro: ResizeObserver | null = null;

		void (async () => {
			const maplibregl = await import('maplibre-gl');
			await import('maplibre-gl/dist/maplibre-gl.css');
			if (disposed || !mapContainer) return;

			map = new maplibregl.Map({
				container: mapContainer,
				// Raster OSM — same approach that worked before (vector + canvas filters were glitchy).
				style: {
					version: 8,
					sources: {
						'osm-tiles': {
							type: 'raster',
							tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
							tileSize: 256,
							attribution:
								'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
						}
					},
					layers: [
						{
							id: 'osm-tiles',
							type: 'raster',
							source: 'osm-tiles',
							minzoom: 0,
							maxzoom: 19
						}
					]
				},
				center: [-86.2384, 41.703],
				zoom: 7,
				attributionControl: { compact: true }
			});

			map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

			const resizeMap = () => map?.resize();
			requestAnimationFrame(resizeMap);
			ro =
				typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeMap) : null;
			ro?.observe(mapContainer);

			for (const marker of data.mapMarkers) {
				const popupContent = `
				<div class="trail-popup">
					<div class="trail-popup__rule" aria-hidden="true"></div>
					<div class="trail-popup__title">${escapeHtml(marker.title)}</div>
					${
						marker.visits
							? `<div class="trail-popup__meta">Visits logged: <span>${marker.visits}</span></div>`
							: ''
					}
					${
						marker.rating
							? `<div class="trail-popup__rating" aria-label="Rating ${marker.rating} of 5">${generateStars(marker.rating)}</div>`
							: ''
					}
					${buildLinksHtml(marker)}
					<div class="trail-popup__rule trail-popup__rule--bottom" aria-hidden="true"></div>
				</div>
			`;

				const popup = new maplibregl.Popup({
					offset: 28,
					className: 'trail-popup-shell',
					maxWidth: '260px',
					closeButton: true,
					closeOnClick: true
				}).setHTML(popupContent);

				new maplibregl.Marker({
					element: createPinElement(marker.title),
					anchor: 'bottom'
				})
					.setLngLat(marker.location)
					.setPopup(popup)
					.addTo(map);
			}
		})();

		return () => {
			disposed = true;
			ro?.disconnect();
			map?.remove();
		};
	});
</script>

<section class="field-map">
	<div class="field-map__case">
		<div class="field-map__frame">
			<div class="field-map__map" bind:this={mapContainer}></div>
			<div class="field-map__vignette" aria-hidden="true"></div>
		</div>
		<p class="field-map__caption">Tap a pin for visits, rating, and gallery links.</p>
	</div>

	<!-- REVERT BASELINE: topo-legend plate look (walnut frame + kraft inset + crimson title) -->
	<header class="field-map__plate">
		<div class="field-map__plate-inner">
			<p class="field-map__kicker">Trail ledger</p>
			<div class="field-map__plate-rule" aria-hidden="true"></div>
			<h1 class="field-map__title">Parks &amp; Hikes</h1>
			<div class="field-map__plate-rule" aria-hidden="true"></div>
			<p class="field-map__lede">
				Pinned stops from the road atlas — visited, rated, and linked.
			</p>

			{#if placeCount > 0}
				<ul class="field-map__stats">
					<li>
						<span class="field-map__stat-value">{placeCount}</span>
						<span class="field-map__stat-label">{placeCount === 1 ? 'place' : 'places'}</span>
					</li>
					{#if totalVisits > 0}
						<li>
							<span class="field-map__stat-value">{totalVisits}</span>
							<span class="field-map__stat-label">{totalVisits === 1 ? 'visit' : 'visits'}</span>
						</li>
					{/if}
					{#if avgRatingLabel}
						<li>
							<span class="field-map__stat-value">{avgRatingLabel}</span>
							<span class="field-map__stat-label">avg rating</span>
						</li>
					{/if}
					{#if linkedCount > 0}
						<li>
							<span class="field-map__stat-value">{linkedCount}</span>
							<span class="field-map__stat-label">linked</span>
						</li>
					{/if}
				</ul>
			{/if}

			{#if topRated}
				<p class="field-map__footnote">
					Highest mark: <span>{topRated.title}</span>
					{#if topRated.rating != null}
						({generateStars(topRated.rating)})
					{/if}
				</p>
			{/if}
		</div>
	</header>
</section>

<style>
	.field-map {
		--trail-ink: #3a3228;
		--trail-paper: #efe6d4;
		--trail-paper-deep: #e4d7be;
		--trail-rule: #8a7355;
		--trail-pin: #8b2e24;
		--trail-pin-deep: #5c1c16;
		--trail-brass: #b8923c;
		--trail-brass-light: #d4b56a;
		margin: 0 auto;
		padding: 1.5rem 0 3rem;
	}

	.field-map__plate {
		max-width: 48rem;
		margin: 1.5rem auto 0;
		padding: 0.4rem;
		background: #5c4632;
		border: 3px double #c4a574;
		box-shadow:
			0 0 0 1px #3d2e20,
			0 12px 28px rgba(40, 28, 12, 0.28);
	}

	.field-map__plate-inner {
		text-align: center;
		padding: 1.15rem 1.35rem 1.35rem;
		background:
			linear-gradient(180deg, rgba(255, 236, 210, 0.14), transparent 42%),
			linear-gradient(180deg, #cbb089 0%, #b89a72 100%);
		border: 1px solid rgba(45, 32, 20, 0.35);
	}

	@media (max-width: 720px) {
		.field-map__plate {
			margin-left: var(--side-margins);
			margin-right: var(--side-margins);
		}
	}

	.field-map__kicker {
		margin: 0;
		font-family: var(--font-special-elite);
		font-size: 0.72rem;
		letter-spacing: 0.28em;
		text-transform: uppercase;
		color: #6b4423;
	}

	.field-map__plate-rule {
		height: 1px;
		margin: 0.65rem auto;
		max-width: 14rem;
		background: repeating-linear-gradient(
			90deg,
			#6b4423 0 5px,
			transparent 5px 9px
		);
		opacity: 0.55;
	}

	.field-map__title {
		margin: 0;
		font-family: var(--font-crimson-text);
		font-size: var(--fs-m);
		font-weight: 600;
		font-style: italic;
		letter-spacing: 0.02em;
		line-height: 1.15;
		color: #2a1c12;
	}

	.field-map__lede {
		margin: 0 auto;
		max-width: 28rem;
		font-family: var(--font-special-elite);
		font-size: 0.8rem;
		line-height: 1.55;
		color: #5a4330;
	}

	.field-map__stats {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.85rem 1.35rem;
		margin: 1rem 0 0;
		padding: 0.85rem 0 0;
		border-top: 1px solid rgba(107, 68, 35, 0.28);
	}

	.field-map__stats li {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		min-width: 4.25rem;
	}

	.field-map__stat-value {
		font-family: var(--font-crimson-text);
		font-size: 1.45rem;
		font-weight: 600;
		font-style: italic;
		line-height: 1;
		color: #2a1c12;
	}

	.field-map__stat-label {
		font-family: var(--font-special-elite);
		font-size: 0.65rem;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #6b4423;
	}

	.field-map__footnote {
		margin: 0.85rem 0 0;
		font-family: var(--font-special-elite);
		font-size: 0.72rem;
		letter-spacing: 0.03em;
		color: #5a4330;
	}

	.field-map__footnote span {
		color: #2a1c12;
	}

	.field-map__case {
		position: relative;
		width: 100%;
		max-width: 1280px;
		margin: 0 auto;
		padding: 0 var(--side-margins);
		box-sizing: border-box;
	}

	.field-map__frame {
		position: relative;
		width: 100%;
		border: 3px double color-mix(in oklab, var(--trail-rule) 70%, var(--trail-ink));
		background: var(--trail-paper-deep);
		padding: 0.55rem;
		box-shadow:
			0 0 0 1px rgba(58, 50, 40, 0.25),
			0 14px 36px rgba(35, 24, 10, 0.28),
			inset 0 0 0 1px rgba(255, 248, 230, 0.35);
	}

	.field-map__map {
		position: relative;
		width: 100%;
		height: min(82vh, 820px);
		min-height: 560px;
		border: 1px solid rgba(58, 50, 40, 0.35);
		isolation: isolate;
	}

	/* Vintage wash over tiles — never filter the WebGL canvas (breaks MapLibre). */
	.field-map__map::after {
		content: '';
		pointer-events: none;
		position: absolute;
		inset: 0;
		z-index: 1;
		background: rgba(180, 140, 80, 0.18);
		mix-blend-mode: multiply;
	}

	.field-map__vignette {
		pointer-events: none;
		position: absolute;
		inset: 0.55rem;
		z-index: 1;
		box-shadow: inset 0 0 64px rgba(42, 30, 14, 0.22);
	}

	.field-map__map :global(.maplibregl-canvas-container) {
		z-index: 0;
	}

	.field-map__map :global(.maplibregl-marker),
	.field-map__map :global(.maplibregl-popup),
	.field-map__map :global(.maplibregl-control-container) {
		z-index: 2;
	}

	.field-map__caption {
		margin: 0.75rem 0 0;
		text-align: center;
		font-family: var(--font-special-elite);
		font-size: calc(var(--fs-xs) * 0.92);
		letter-spacing: 0.02em;
		color: color-mix(in oklab, var(--trail-ink) 65%, transparent);
	}

	/* MapLibre chrome */
	.field-map__map :global(.maplibregl-ctrl-group) {
		background: var(--trail-paper);
		border: 1px solid color-mix(in oklab, var(--trail-rule) 65%, transparent);
		border-radius: 2px;
		box-shadow: 0 2px 8px rgba(40, 28, 12, 0.2);
		overflow: hidden;
	}

	.field-map__map :global(.maplibregl-ctrl-group button) {
		background: transparent;
		border-color: color-mix(in oklab, var(--trail-rule) 35%, transparent);
	}

	.field-map__map :global(.maplibregl-ctrl-group button + button) {
		border-top-color: color-mix(in oklab, var(--trail-rule) 35%, transparent);
	}

	.field-map__map :global(.maplibregl-ctrl-attrib) {
		background: color-mix(in oklab, var(--trail-paper) 88%, transparent);
		font-family: var(--font-special-elite);
		font-size: 0.65rem;
		color: var(--trail-ink);
	}

	.field-map__map :global(.maplibregl-ctrl-attrib a) {
		color: var(--trail-pin-deep);
	}

	/* Custom pins — root must not use `transform` (MapLibre owns that). */
	:global(.trail-pin) {
		display: block;
		width: 36px;
		height: 40px;
		padding: 0;
		border: 0;
		margin: 0;
		background: transparent;
		cursor: pointer;
		line-height: 0;
		overflow: visible;
	}

	:global(.trail-pin__lift) {
		display: block;
		width: 36px;
		height: 40px;
		line-height: 0;
		filter: drop-shadow(0 2px 2px rgba(40, 28, 12, 0.4));
		transition: translate 160ms ease;
	}

	:global(.trail-pin:hover .trail-pin__lift),
	:global(.trail-pin:focus-visible .trail-pin__lift) {
		translate: 0 -2px;
	}

	:global(.trail-pin:focus-visible) {
		outline: none;
	}

	:global(.trail-pin__glyph) {
		display: block;
		overflow: visible;
	}

	:global(.trail-pin__body) {
		fill: #8b2e24;
		stroke: #5c1c16;
		stroke-width: 1.25;
	}

	:global(.trail-pin__rim) {
		fill: none;
		stroke: #b8923c;
		stroke-width: 2;
	}

	:global(.trail-pin__face) {
		fill: #f3ead6;
		stroke: #b8923c;
		stroke-width: 1;
	}

	:global(.trail-pin__glint) {
		fill: rgba(255, 255, 255, 0.55);
	}

	/* Field-note popup */
	:global(.trail-popup-shell.maplibregl-popup) {
		font-family: var(--font-special-elite);
	}

	:global(.trail-popup-shell .maplibregl-popup-content) {
		padding: 0.85rem 0.95rem 0.95rem;
		background:
			linear-gradient(180deg, #f7f0e2 0%, var(--trail-paper, #efe6d4) 100%);
		border: 1px solid color-mix(in oklab, var(--trail-rule, #8a7355) 70%, #3a3228);
		border-radius: 2px;
		box-shadow:
			0 0 0 1px rgba(255, 248, 230, 0.45) inset,
			0 10px 24px rgba(35, 24, 10, 0.28);
		color: var(--trail-ink, #3a3228);
	}

	:global(.trail-popup-shell .maplibregl-popup-tip) {
		border-top-color: var(--trail-paper, #efe6d4);
	}

	:global(.trail-popup-shell .maplibregl-popup-close-button) {
		font-size: 1.1rem;
		color: var(--trail-rule, #8a7355);
		padding: 0.15rem 0.45rem;
	}

	:global(.trail-popup-shell .maplibregl-popup-close-button:hover) {
		background: transparent;
		color: var(--trail-pin-deep, #5c1c16);
	}

	:global(.trail-popup__rule) {
		height: 1px;
		margin: 0 0 0.55rem;
		background: repeating-linear-gradient(
			90deg,
			color-mix(in oklab, var(--trail-rule, #8a7355) 75%, transparent) 0 6px,
			transparent 6px 10px
		);
	}

	:global(.trail-popup__rule--bottom) {
		margin: 0.7rem 0 0;
	}

	:global(.trail-popup__title) {
		font-family: var(--font-oswald);
		font-size: 1.05rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-align: center;
		color: var(--trail-ink, #3a3228);
		margin-bottom: 0.45rem;
	}

	:global(.trail-popup__meta) {
		text-align: center;
		font-size: 0.78rem;
		letter-spacing: 0.04em;
		color: color-mix(in oklab, var(--trail-ink, #3a3228) 72%, transparent);
		margin-bottom: 0.25rem;
	}

	:global(.trail-popup__meta span) {
		color: var(--trail-pin-deep, #5c1c16);
	}

	:global(.trail-popup__rating) {
		text-align: center;
		font-size: 1.25rem;
		letter-spacing: 0.14em;
		color: var(--trail-brass, #b8923c);
		margin: 0.3rem 0 0.4rem;
	}

	:global(.trail-popup__links) {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		margin-top: 0.65rem;
		padding-top: 0.55rem;
		border-top: 1px solid color-mix(in oklab, var(--trail-rule, #8a7355) 45%, transparent);
	}

	:global(.trail-popup__link) {
		display: block;
		text-align: center;
		font-size: 0.78rem;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		text-decoration: none;
		color: var(--trail-pin-deep, #5c1c16);
		border: 1px solid color-mix(in oklab, var(--trail-pin, #8b2e24) 45%, transparent);
		padding: 0.35rem 0.5rem;
		background: color-mix(in oklab, #fff8e8 55%, transparent);
		transition:
			background 0.15s ease,
			border-color 0.15s ease;
	}

	:global(.trail-popup__link:hover),
	:global(.trail-popup__link:focus-visible) {
		background: color-mix(in oklab, var(--trail-brass-light, #d4b56a) 35%, #fff8e8);
		border-color: var(--trail-pin, #8b2e24);
		outline: none;
	}

	@media (max-width: 640px) {
		.field-map__map {
			min-height: 480px;
			height: 70vh;
		}
	}
</style>
