<script lang="ts">
	import { page } from '$app/state';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import type { GalleryAlbum, Media } from '$lib/types/payload-types';
	import { lexicalToPlainText } from '$lib/utils/lexical-to-text';
	import { isVideoMedia } from '$lib/utils/media-url';
	import { getMediaUrl } from '$lib/utils/media-url';
	import ExifIcon from '$lib/components/ExifIcon.svelte';
	import GalleryMediaPlayer from '$lib/components/GalleryMediaPlayer.svelte';

	const ALL_SIZE_KEYS = ['thumbnail', 'small', 'medium', 'large', 'xlarge'] as const;
	function buildSrcsets(img: Media | undefined, proxy: boolean) {
		const s = img?.sizes;
		const avif: string[] = [];
		const jpeg: string[] = [];
		for (const key of ALL_SIZE_KEYS) {
			const size = s?.[key];
			if (!size?.url || size.width == null) continue;
			const entry = `${getMediaUrl(size.url, proxy)} ${size.width}w`;
			if (size.mimeType === 'image/avif') {
				avif.push(entry);
			} else {
				jpeg.push(entry);
			}
		}
		return { avifSrcset: avif.join(', '), jpegSrcset: jpeg.join(', ') };
	}

	const isAdmin = $derived(
		!!page.data.session?.user &&
			(page.data.session?.user?.role as string[] | undefined)?.includes('admin')
	);

	let {
		image,
		index,
		total,
		imageSrc,
		isLoaded,
		placeholderSrc,
		onImageLoad,
		onClose,
		onPrevious,
		onNext,
		hasPrevious,
		hasNext,
		gallery,
		galleryImageId,
		useProxy
	}: {
		image: Media | undefined;
		index: number;
		total: number;
		imageSrc: string | null;
		isLoaded: boolean;
		placeholderSrc: string | null;
		onImageLoad: () => void;
		onClose: () => void;
		onPrevious: () => void;
		onNext: () => void | Promise<void>;
		hasPrevious: boolean;
		hasNext: boolean;
		gallery: GalleryAlbum;
		galleryImageId?: number;
		useProxy?: boolean;
	} = $props();

	const isVideo = $derived(image ? isVideoMedia(image) : false);
	const resolvedImageSrc = $derived(imageSrc ?? (image?.url ? getMediaUrl(image.url, useProxy ?? false) : null));
	const lightboxSrcsets = $derived(buildSrcsets(image, useProxy ?? false));

	/** Blurhash (or parent-passed placeholder string) for underlay while full image loads */
	const blurPlaceholder = $derived.by(() => {
		const p = placeholderSrc ?? image?.blurhash;
		return p != null && String(p).length > 0 ? String(p) : null;
	});

	/** Thumbnail URL when there is no blurhash — still faster to paint than full srcset */
	const thumbPlaceholder = $derived.by(() => {
		if (blurPlaceholder) return null;
		if (!image?.sizes) return null;
		const fallbackSize =
			image.sizes.thumbnail?.url ??
			image.sizes.small?.url ??
			image.sizes.medium?.url ??
			null;
		return fallbackSize ? getMediaUrl(fallbackSize, useProxy ?? false) : null;
	});

	/** Load state for the main <img> (picture/srcset); do not trust parent isLoaded — it probes src only */
	let mainImageLoaded = $state(false);

	$effect(() => {
		index;
		resolvedImageSrc;
		mainImageLoaded = false;
	});

	const showImageLoadingUi = $derived(!isVideo && !!resolvedImageSrc && !mainImageLoaded);

	// Caption (Lexical) or alt as fallback
	const captionText = $derived(
		image?.caption ? lexicalToPlainText(image.caption) : null
	);
	const displayCaption = $derived((captionText && captionText.trim()) || image?.alt || '');

	const imageAspectRatio = $derived(
		image?.width && image?.height ? image.width / image.height : 1
	);

	// EXIF metadata: split into camera settings vs date/location
	type ExifItem = { label: string; value: string; icon: 'camera' | 'lens' | 'aperture' | 'shutter' | 'iso' | 'focal' | 'program' | 'bias' | 'wb' | 'metering' | 'flash' };

	const { cameraSettings, dateTaken, location } = $derived.by(() => {
		const camera: ExifItem[] = [];
		let date: string | null = null;
		let loc: string | null = null;

		if (!image) return { cameraSettings: camera, dateTaken: date, location: loc };

		const exifData = (image.exif as { exif?: Record<string, { description?: string }> } | undefined)
			?.exif;
		if (!exifData || typeof exifData !== 'object' || Array.isArray(exifData)) {
			return { cameraSettings: camera, dateTaken: date, location: loc };
		}

		const getDesc = (key: string): string | null => {
			const field = exifData[key];
			if (!field || typeof field !== 'object' || !('description' in field)) return null;
			const d = (field as { description?: string }).description;
			return d != null && d !== '' ? d : null;
		};

		const add = (label: string, value: string | null, icon: ExifItem['icon']) => {
			if (value != null && value !== '') camera.push({ label, value, icon });
		};

		add('Camera', getDesc('Model') ?? getDesc('Make'), 'camera');
		add('Lens', getDesc('LensModel'), 'lens');
		add('Aperture', getDesc('FNumber'), 'aperture');

		const exposure = getDesc('ExposureTime');
		if (exposure) {
			const num = parseFloat(exposure);
			if (Number.isNaN(num) || exposure.includes('/')) {
				add('Shutter speed', exposure.includes('s') ? exposure : `${exposure} s`, 'shutter');
			} else {
				add('Shutter speed', num >= 1 ? `${exposure} s` : `1/${Math.round(1 / num)} s`, 'shutter');
			}
		}

		add('ISO', getDesc('ISOSpeedRatings'), 'iso');
		add('Focal length', getDesc('FocalLength'), 'focal');
		add('Exposure program', getDesc('ExposureProgram'), 'program');

		const bias = getDesc('ExposureBiasValue');
		if (bias) {
			const ev = parseFloat(bias);
			add('Exposure bias', Number.isNaN(ev) ? bias : ev === 0 ? '0 EV' : `${ev > 0 ? '+' : ''}${ev} EV`, 'bias');
		}

		add('White balance', getDesc('WhiteBalance'), 'wb');
		add('Metering mode', getDesc('MeteringMode'), 'metering');
		add('Flash', getDesc('Flash'), 'flash');

		const dateStr = getDesc('DateTimeOriginal');
		if (dateStr) {
			const m = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
			if (m) {
				const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
				const monthDay = new Intl.DateTimeFormat(undefined, {
					month: 'long',
					day: 'numeric',
					year: 'numeric'
				}).format(d);
				const time = new Intl.DateTimeFormat(undefined, {
					timeStyle: 'short'
				}).format(d);
				date = `${monthDay} at ${time}`;
			} else {
				date = dateStr;
			}
		}

		// GPS / location if available
		const gpsLat = getDesc('GPSLatitude');
		const gpsLon = getDesc('GPSLongitude');
		if (gpsLat && gpsLon) {
			loc = `${gpsLat}, ${gpsLon}`;
		}

		return { cameraSettings: camera, dateTaken: date, location: loc };
	});
</script>

<div
	class="gallery-lightbox"
	style:--image-aspect-ratio={imageAspectRatio}
>
	<div class="gallery-lightbox__body">
		<!-- Left 75%: image pane with arrows on edges, close in corner -->
		<div class="gallery-lightbox__image-pane">
			<button
				class="gallery-lightbox__backdrop"
				onclick={onClose}
				aria-label="Close lightbox"
				type="button"
			></button>

			<button
				class="gallery-lightbox__close"
				onclick={(e) => { e.stopPropagation(); onClose(); }}
				aria-label="Close lightbox"
				type="button"
			>
				<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>

			<button
				class="gallery-lightbox__nav gallery-lightbox__nav--prev"
				class:gallery-lightbox__nav--disabled={!hasPrevious}
				disabled={!hasPrevious}
				onclick={(e) => { e.stopPropagation(); onPrevious(); }}
				aria-label="Previous image"
				type="button"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
			</button>

			<div
				class="gallery-lightbox__image-frame"
				style:aspect-ratio={imageAspectRatio}
				role="presentation"
			>
				{#if isVideo && image}
					<GalleryMediaPlayer media={image} useProxy={useProxy ?? false} className="gallery-lightbox__video" />
				{:else}
					{#if showImageLoadingUi}
						<div
							class="gallery-lightbox__loading-overlay"
							aria-busy="true"
							aria-label="Loading image"
						>
							{#if blurPlaceholder}
								<img
									src={blurPlaceholder}
									alt=""
									class="gallery-lightbox__placeholder gallery-lightbox__placeholder--blurhash"
								/>
							{:else if thumbPlaceholder}
								<img
									src={thumbPlaceholder}
									alt=""
									class="gallery-lightbox__placeholder gallery-lightbox__placeholder--thumb"
								/>
							{:else}
								<div class="gallery-lightbox__loading-backdrop" aria-hidden="true"></div>
							{/if}
							<div class="gallery-lightbox__spinner" aria-hidden="true"></div>
						</div>
					{/if}
					{#if resolvedImageSrc}
						<picture class="gallery-lightbox__picture">
							<source type="image/avif" srcset={lightboxSrcsets.avifSrcset || undefined} sizes="100vw" />
							<source type="image/jpeg" srcset={lightboxSrcsets.jpegSrcset || undefined} sizes="100vw" />
							<img
								class="gallery-lightbox__image"
								src={resolvedImageSrc ?? ''}
								alt={image?.alt ?? ''}
								width={image?.width}
								height={image?.height}
								fetchpriority="high"
								decoding="async"
								style:opacity={mainImageLoaded ? 1 : 0}
								onload={() => {
									mainImageLoaded = true;
									onImageLoad();
								}}
								onerror={() => {
									mainImageLoaded = true;
									onImageLoad();
								}}
							/>
						</picture>
					{/if}
				{/if}
			</div>

			<button
				class="gallery-lightbox__nav gallery-lightbox__nav--next"
				class:gallery-lightbox__nav--disabled={!hasNext}
				disabled={!hasNext}
				onclick={(e) => { e.stopPropagation(); onNext(); }}
				aria-label="Next image"
				type="button"
			>
				<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>
			</button>

			<p class="gallery-lightbox__counter">{index + 1} / {total}</p>
		</div>

		<!-- Right 25%: info panel with 4 sections -->
		<aside class="gallery-lightbox__info">
			<section class="gallery-lightbox__section">
				<div class="gallery-lightbox__section-header">
					<h3 class="gallery-lightbox__section-title">Albums</h3>
					{#if isAdmin && galleryImageId}
						<a
							href={`${PUBLIC_PAYLOAD_URL}/admin/collections/gallery-images/${galleryImageId}`}
							target="_blank"
							rel="noopener noreferrer"
							class="gallery-lightbox__edit-link"
							aria-label="Edit image in CMS"
						>
							Edit
						</a>
					{/if}
				</div>
				<p class="gallery-lightbox__section-text">{gallery.title}</p>
			</section>

			<section class="gallery-lightbox__section">
				<h3 class="gallery-lightbox__section-title">Caption</h3>
				<p class="gallery-lightbox__section-text gallery-lightbox__caption">{displayCaption || '—'}</p>
			</section>

			<section class="gallery-lightbox__section">
				<h3 class="gallery-lightbox__section-title">Camera Settings</h3>
				{#if cameraSettings.length > 0}
					<div class="gallery-lightbox__meta-grid">
						{#each cameraSettings as { label, value, icon } (`${label}-${icon}-${value}`)}
							<div class="gallery-lightbox__meta-item">
								<div class="gallery-lightbox__meta-icon">
									<ExifIcon {icon} />
								</div>
								<div class="gallery-lightbox__meta-content">
									<span class="gallery-lightbox__meta-label">{label}</span>
									<span class="gallery-lightbox__meta-value">{value}</span>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="gallery-lightbox__section-text">—</p>
				{/if}
			</section>

			<section class="gallery-lightbox__section">
				<h3 class="gallery-lightbox__section-title">Date & Location</h3>
				{#if dateTaken || location}
					<div class="gallery-lightbox__meta-grid gallery-lightbox__meta-grid--single">
						{#if dateTaken}
							<div class="gallery-lightbox__meta-item">
								<div class="gallery-lightbox__meta-icon">
									<ExifIcon icon="calendar" />
								</div>
								<div class="gallery-lightbox__meta-content">
									<span class="gallery-lightbox__meta-label">Taken</span>
									<span class="gallery-lightbox__meta-value">{dateTaken}</span>
								</div>
							</div>
						{/if}
						{#if location}
							<div class="gallery-lightbox__meta-item">
								<div class="gallery-lightbox__meta-icon">
									<ExifIcon icon="location" />
								</div>
								<div class="gallery-lightbox__meta-content">
									<span class="gallery-lightbox__meta-label">Location</span>
									<span class="gallery-lightbox__meta-value">{location}</span>
								</div>
							</div>
						{/if}
					</div>
				{:else}
					<p class="gallery-lightbox__section-text">—</p>
				{/if}
			</section>
		</aside>
	</div>
</div>

<style>
	.gallery-lightbox {
		display: flex;
		width: 100%;
		height: 100%;
		min-height: 0;
		background: transparent;
		overflow: hidden;
		pointer-events: none;
	}

	.gallery-lightbox__body {
		display: flex;
		flex-direction: row;
		width: 100%;
		height: 100%;
		min-width: 0;
		min-height: 0;
		pointer-events: none;
	}

	.gallery-lightbox__backdrop,
	.gallery-lightbox__close,
	.gallery-lightbox__nav,
	.gallery-lightbox__info {
		pointer-events: auto;
	}

	/* Left 75%: image pane */
	.gallery-lightbox__image-pane {
		flex: 0 0 75%;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
	}

	.gallery-lightbox__backdrop {
		position: absolute;
		inset: 0;
		z-index: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.gallery-lightbox__close {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 10;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		border: none;
		border-radius: 8px;
		color: white;
		cursor: pointer;
		transition: background 200ms ease;
	}

	.gallery-lightbox__close:hover {
		background: rgba(0, 0, 0, 0.6);
	}

	.gallery-lightbox__nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 10;
		width: 48px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.4);
		border: none;
		border-radius: 8px;
		color: white;
		cursor: pointer;
		transition: background 200ms ease;
	}

	.gallery-lightbox__nav:hover {
		background: rgba(0, 0, 0, 0.6);
	}

	.gallery-lightbox__nav--disabled {
		opacity: 0.2;
		cursor: default;
		pointer-events: none;
	}

	.gallery-lightbox__nav--prev {
		left: 1rem;
	}

	.gallery-lightbox__nav--next {
		right: 1rem;
	}

	.gallery-lightbox__image-frame {
		position: relative;
		width: 100%;
		max-width: 100%;
		max-height: 100%;
		overflow: hidden;
		z-index: 1;
		pointer-events: none;
	}

	.gallery-lightbox__image-frame :global(.gallery-media-player),
	.gallery-lightbox__image-frame .gallery-lightbox__image,
	.gallery-lightbox__image-frame .gallery-lightbox__placeholder {
		pointer-events: auto;
	}

	.gallery-lightbox__counter {
		position: absolute;
		bottom: 0.75rem;
		left: 0.75rem;
		z-index: 10;
		margin: 0;
		padding: 0.375rem 0.625rem;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-white-lightest);
		background: rgba(0, 0, 0, 0.5);
		border-radius: 6px;
		pointer-events: none;
	}

	.gallery-lightbox__loading-overlay {
		position: absolute;
		inset: 0;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.gallery-lightbox__loading-backdrop {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, rgba(20, 20, 20, 0.85), rgba(10, 10, 10, 0.95));
		z-index: 0;
	}

	.gallery-lightbox__placeholder {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
		z-index: 0;
	}

	.gallery-lightbox__placeholder--blurhash {
		filter: blur(12px);
		transform: scale(1.03);
		opacity: 0.95;
	}

	.gallery-lightbox__placeholder--thumb {
		filter: blur(8px);
		opacity: 0.9;
	}

	.gallery-lightbox__spinner {
		position: relative;
		z-index: 1;
		width: 2.5rem;
		height: 2.5rem;
		border: 3px solid rgba(255, 255, 255, 0.25);
		border-top-color: rgba(255, 255, 255, 0.95);
		border-radius: 50%;
		animation: gallery-lightbox-spin 0.7s linear infinite;
		box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
	}

	@keyframes gallery-lightbox-spin {
		to {
			transform: rotate(360deg);
		}
	}

	.gallery-lightbox__picture {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		z-index: 3;
		animation: imageFadeIn 180ms ease;
	}

	.gallery-lightbox__image {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
		transition: opacity 300ms ease;
	}

	.gallery-lightbox__image-frame :global(.gallery-lightbox__video) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* Thin border between image and info */
	.gallery-lightbox__info {
		flex: 0 0 25%;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding: 1.5rem;
		overflow-y: auto;
		background: var(--color-tertiary-darker);
		border-left: 1px solid var(--color-tertiary-lighter);
		color: var(--color-white-lightest);
		font-family: var(--font-special-elite);
		animation: infoPanelFade 180ms ease;
	}

	@keyframes infoPanelFade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes imageFadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.gallery-lightbox__section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.gallery-lightbox__section-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-tertiary-lighter);
	}

	.gallery-lightbox__section-title {
		font-size: var(--fs-base);
		font-weight: 600;
		margin: 0;
		color: var(--color-secondary);
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-tertiary-lighter);
	}

	.gallery-lightbox__section-header .gallery-lightbox__section-title {
		padding-bottom: 0;
		border-bottom: none;
	}

	.gallery-lightbox__edit-link {
		font-size: var(--fs-xs);
		color: var(--color-secondary);
		text-decoration: none;
		flex-shrink: 0;
	}

	.gallery-lightbox__edit-link:hover {
		text-decoration: underline;
	}

	.gallery-lightbox__section-text {
		font-size: var(--fs-xs);
		line-height: 1.5;
		margin: 0;
		color: var(--color-white-lightest);
	}

	.gallery-lightbox__caption {
		font-family: var(--font-crimson-text);
		font-style: italic;
	}

	.gallery-lightbox__meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem 1.25rem;
	}

	.gallery-lightbox__meta-grid--single {
		grid-template-columns: 1fr;
	}

	.gallery-lightbox__meta-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.gallery-lightbox__meta-icon {
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--color-secondary);
	}

	.gallery-lightbox__meta-content {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		min-width: 0;
	}

	.gallery-lightbox__meta-label {
		font-size: 1rem;
		color: var(--color-tertiary);
		font-weight: 500;
	}

	.gallery-lightbox__meta-value {
		font-size: 1rem;
		color: var(--color-white-lightest);
	}

	@media (max-width: 768px) {
		.gallery-lightbox__body {
			flex-direction: column;
		}

		.gallery-lightbox__image-pane {
			flex: 1 1 auto;
			min-height: 50vh;
		}

		.gallery-lightbox__info {
			flex: 0 0 auto;
			border-left: none;
			border-top: 1px solid var(--color-tertiary-lighter);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-lightbox__spinner {
			animation: none;
			border-top-color: rgba(255, 255, 255, 0.6);
		}
	}

</style>
