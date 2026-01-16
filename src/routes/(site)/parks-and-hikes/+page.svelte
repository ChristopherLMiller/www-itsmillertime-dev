<script lang="ts">
	import { onMount } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import '@fortawesome/fontawesome-free/css/all.min.css';
	import Panel from "$lib/Panel.svelte";
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let mapContainer: HTMLDivElement;

	function generateStars(rating: number | null | undefined): string {
		if (!rating) return '';

		const fullStars = Math.floor(rating);
		const hasHalf = rating % 1 >= 0.5;
		const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

		let stars = '';
		for (let i = 0; i < fullStars; i++) {
			stars += '<i class="fa-solid fa-star"></i>';
		}
		if (hasHalf) {
			stars += '<i class="fa-solid fa-star-half-stroke"></i>';
		}
		for (let i = 0; i < emptyStars; i++) {
			stars += '<i class="fa-regular fa-star"></i>';
		}

		return stars;
	}

	onMount(() => {
		const map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				sources: {
					'osm-tiles': {
						type: 'raster',
						tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
						tileSize: 256,
						attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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
			center: [-86.2384, 41.7030], // Notre Dame, South Bend, Indiana
			zoom: 7
		});

		// Add markers to the map
		data.mapMarkers.forEach((marker) => {
			const linksHTML = marker.links && marker.links.length > 0
				? `<div class="popup-links">
						${marker.links.map(link => {
							// Handle external URL
							if (link.url) {
								return `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.title}</a>`;
							}
							// Handle gallery album link
							if (link.album) {
								const album = typeof link.album.value === 'object' ? link.album.value : null;
								if (album && album.slug) {
									return `<a href="/galleries/${album.slug}">${link.title}</a>`;
								}
							}
							return '';
						}).filter(Boolean).join('')}
					</div>`
				: '';

			const popupContent = `
				<div class="marker-popup">
					<div class="popup-title">${marker.title}</div>
					${marker.visits ? `<div class="popup-visits">Visits: ${marker.visits}</div>` : ''}
					${marker.rating ? `<div class="popup-rating">${generateStars(marker.rating)}</div>` : ''}
					${linksHTML}
				</div>
			`;

			const popup = new maplibregl.Popup({ offset: 25 }).setHTML(popupContent);

			new maplibregl.Marker()
				.setLngLat(marker.location)
				.setPopup(popup)
				.addTo(map);
		});

		return () => {
			map.remove();
		};
	});
</script>

<div class="map-container" bind:this={mapContainer}></div>

<style>
	.map-container {
		width: 100%;
		height: 600px;
	}

	:global(.marker-popup) {
		font-family: var(--font-special-elite);
		line-height: 1.6;
		min-width: 200px;
		text-align: center;
	}

	:global(.popup-title) {
		font-weight: bold;
		font-size: var(--fs-xs);
		color: var(--color-primary-darker);
		margin-bottom: 0.5rem;
	}

	:global(.popup-visits) {
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darker);
		margin-bottom: 0.25rem;
	}

	:global(.popup-rating) {
		font-size: var(--fs-base);
		color: var(--color-secondary);
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
	}

	:global(.popup-links) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 2px solid var(--color-tertiary-lighter);
	}

	:global(.popup-links a) {
		font-size: var(--fs-xs);
		color: var(--color-primary);
		text-decoration: underline;
		transition: color 0.2s ease;
	}

	:global(.popup-links a:hover) {
		color: var(--color-primary-darker);
	}
</style>