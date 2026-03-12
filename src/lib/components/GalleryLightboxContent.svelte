<script lang="ts">
	import type { GalleryAlbum, Media } from '$lib/types/payload-types';
	import { lexicalToPlainText } from '$lib/utils/lexical-to-text';

	let {
		image,
		index,
		total,
		imageSrc,
		isLoaded,
		placeholderSrc,
		onImageLoad,
		gallery
	}: {
		image: Media | undefined;
		index: number;
		total: number;
		imageSrc: string | null;
		isLoaded: boolean;
		placeholderSrc: string | null;
		onImageLoad: () => void;
		gallery: GalleryAlbum;
	} = $props();

	// Caption (Lexical) or alt as fallback
	const captionText = $derived(
		image?.caption ? lexicalToPlainText(image.caption) : null
	);
	const displayCaption = $derived((captionText && captionText.trim()) || image?.alt || '');

	const imageAspectRatio = $derived(
		image?.width && image?.height ? image.width / image.height : 1
	);

	// EXIF metadata for display (exif.exif has { id, value, description } per field)
	const imageInfo = $derived.by(() => {
		if (!image) return [];
		const info: { label: string; value: string }[] = [];

		const exifData = (image.exif as { exif?: Record<string, { description?: string }> } | undefined)
			?.exif;
		if (!exifData || typeof exifData !== 'object' || Array.isArray(exifData)) return info;

		const getDesc = (key: string): string | null => {
			const field = exifData[key];
			if (!field || typeof field !== 'object' || !('description' in field)) return null;
			const d = (field as { description?: string }).description;
			return d != null && d !== '' ? d : null;
		};

		const add = (label: string, value: string | null) => {
			if (value != null && value !== '') info.push({ label, value });
		};

		// Camera: Model (includes make) or Make as fallback
		add('Camera', getDesc('Model') ?? getDesc('Make'));

		add('Lens', getDesc('LensModel'));
		add('Aperture', getDesc('FNumber'));

		// Shutter speed: format as "X s" or "1/X s" for human readability
		const exposure = getDesc('ExposureTime');
		if (exposure) {
			const num = parseFloat(exposure);
			if (Number.isNaN(num) || exposure.includes('/')) {
				add('Shutter speed', exposure.includes('s') ? exposure : `${exposure} s`);
			} else {
				add('Shutter speed', num >= 1 ? `${exposure} s` : `1/${Math.round(1 / num)} s`);
			}
		}

		add('ISO', getDesc('ISOSpeedRatings'));
		add('Focal length', getDesc('FocalLength'));
		add('Exposure program', getDesc('ExposureProgram'));

		// Exposure bias: format as "±X EV" when not zero
		const bias = getDesc('ExposureBiasValue');
		if (bias) {
			const ev = parseFloat(bias);
			add('Exposure bias', Number.isNaN(ev) ? bias : ev === 0 ? '0 EV' : `${ev > 0 ? '+' : ''}${ev} EV`);
		}

		add('White balance', getDesc('WhiteBalance'));
		add('Metering mode', getDesc('MeteringMode'));
		add('Flash', getDesc('Flash'));

		// Date taken: human-friendly format (e.g. "Sep 25, 2020 at 8:39 PM")
		const dateStr = getDesc('DateTimeOriginal');
		if (dateStr) {
			const m = dateStr.match(/^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/);
			if (m) {
				const date = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
				add(
					'Date taken',
					new Intl.DateTimeFormat(undefined, {
						dateStyle: 'medium',
						timeStyle: 'short'
					}).format(date)
				);
			} else {
				add('Date taken', dateStr);
			}
		}

		return info;
	});
</script>

<div
	class="gallery-lightbox"
	style:--image-aspect-ratio={imageAspectRatio}
>
	<div class="gallery-lightbox__body">
		<div class="gallery-lightbox__image-pane">
			<div
				class="gallery-lightbox__image-frame"
				style:aspect-ratio={imageAspectRatio}
			>
				{#if placeholderSrc && !isLoaded}
					<img
						class="gallery-lightbox__placeholder"
						src={placeholderSrc}
						alt="Loading"
						aria-hidden="true"
					/>
				{/if}
				{#if imageSrc}
					<img
						class="gallery-lightbox__image"
						src={imageSrc}
						alt={image?.alt ?? ''}
						width={image?.width}
						height={image?.height}
						style:opacity={isLoaded ? 1 : 0}
						onload={onImageLoad}
					/>
				{/if}
			</div>
		</div>
		<aside class="gallery-lightbox__info">
				<h2 class="gallery-lightbox__title">{gallery.title}</h2>

				{#if displayCaption}
					<p class="gallery-lightbox__caption">{displayCaption}</p>
				{/if}

				{#if imageInfo.length > 0}
					<dl class="gallery-lightbox__meta">
						{#each imageInfo as { label, value }}
							<div class="gallery-lightbox__meta-row">
								<dt>{label}</dt>
								<dd>{value}</dd>
							</div>
						{/each}
					</dl>
				{/if}

				<p class="gallery-lightbox__counter">{index + 1} / {total}</p>
		</aside>
	</div>
</div>

<style>
	/* Polaroid-style padding: ~1rem on all sides */
	.gallery-lightbox {
		--gallery-lightbox-padding: 1.25rem;
		display: flex;
		width: 100%;
		height: 100%;
		min-height: 0;
		align-items: center;
		justify-content: center;
		gap: 0;
		background: transparent;
		overflow: visible;
		pointer-events: none;
	}

	.gallery-lightbox__body {
		display: flex;
		flex-direction: row;
		width: 100%;
		/* Image pane takes remaining space, info fixed 320px; body height = image height */
		max-width: min(
			100%,
			calc(320px + (100vh - 4rem) * var(--image-aspect-ratio, 1))
		);
		min-width: 0;
		height: fit-content;
		background: transparent;
		overflow: visible;
		margin-inline: auto;
		pointer-events: auto;
	}

	.gallery-lightbox__image-pane {
		flex: 1 1 0;
		min-width: 0;
	}

	.gallery-lightbox__image-frame {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.gallery-lightbox__placeholder {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		filter: blur(20px);
		opacity: 0.8;
	}

	.gallery-lightbox__image {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
		transition: opacity 300ms ease;
	}

	.gallery-lightbox__info {
		flex: 0 0 320px;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding: 1.25rem;
		overflow: hidden;
		background: white;
		color: #222;
		font-family: var(--font-roboto);
	}

	.gallery-lightbox__title {
		font-family: var(--font-oswald);
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
		color: #222;
	}

	.gallery-lightbox__caption {
		font-family: var(--font-roboto);
		font-size: 0.9375rem;
		line-height: 1.5;
		margin: 0;
		color: #444;
	}

	.gallery-lightbox__meta {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
		font-size: 0.8125rem;
		font-family: var(--font-roboto);
	}

	.gallery-lightbox__meta-row {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0;
		border-bottom: 1px solid rgba(0, 0, 0, 0.08);
	}

	.gallery-lightbox__meta-row:last-child {
		border-bottom: none;
	}

	.gallery-lightbox__meta-row dt {
		margin: 0;
		color: #666;
		font-weight: 500;
	}

	.gallery-lightbox__meta-row dd {
		margin: 0;
		color: #222;
		text-align: right;
	}

	.gallery-lightbox__counter {
		font-family: var(--font-roboto);
		font-size: 0.8125rem;
		color: #888;
		margin: auto 0 0 0;
	}

	@media (max-width: 768px) {
		.gallery-lightbox__body {
			flex-direction: column;
		}

		.gallery-lightbox__image-pane {
			width: 100%;
		}

		.gallery-lightbox__info {
			flex: unset;
			width: 100%;
			min-width: unset;
		}
	}
</style>
