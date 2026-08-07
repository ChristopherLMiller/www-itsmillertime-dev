<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import ShareButtons from '$lib/components/ShareButtons';
	import type { GalleryAlbum, Media } from '$lib/types/payload-types';
	import {
		ensureGalleryImageTrackingOnOpen,
		getStoredGalleryImageVote,
		recordGalleryImageTracking,
		type GalleryImageVote
	} from '$lib/utils/gallery-image-tracking';
	import {
		normalizeGalleryImageTracking,
		type GalleryImageTrackingCounts
	} from '$lib/utils/gallery-image-tracking/types';
	import { preventContextMenu } from '$lib/utils/prevent-context-menu';
	import { lexicalToPlainText, plainTextToLexical } from '$lib/utils/lexical-to-text';
	import { getMediaUrl, getLightboxPaintUrl, getLightboxZoomUrl, isVideoMedia } from '$lib/utils/media-url';
	import Lexical from '$lib/components/Lexical';
	import type { GalleryImage } from '$lib/types/payload-types';
	import { imageZoomPan, type ImageZoomPanHandle, type ImageZoomPanTransform } from '$lib/utils/image-zoom-pan';
	import {
		createLightboxZoomCanvasController,
		type LightboxZoomCanvasPaintInput
	} from '$lib/utils/lightbox-zoom-canvas';
	import { disposeZoomBitmap, loadZoomBitmap } from '$lib/utils/lightbox-zoom-source';
	import ExifIcon from '$lib/components/ExifIcon';
	import GalleryMediaPlayer from '$lib/components/gallery/GalleryMediaPlayer';
	import BuyButton from '$lib/components/commerce/BuyButton.svelte';
	import type { GalleryCommerce } from '$lib/utils/gallery-image-display';
	import { displayableImageTitle } from '$lib/utils/gallery-image-display';
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

	/** Crossfade duration: blurhash/placeholder out ↔ full image in */
	const IMAGE_REVEAL_MS = 320;

	const isAdmin = $derived(
		!!page.data.session?.user &&
			(page.data.session?.user?.role as string[] | undefined)?.includes('admin')
	);

	type SidebarTab = 'information' | 'admin' | 'shop';

	const INFO_COLLAPSED_KEY = 'gallery-lightbox-info-collapsed';

	function readInfoCollapsedPref(): boolean {
		if (!browser) return false;
		try {
			return localStorage.getItem(INFO_COLLAPSED_KEY) === '1';
		} catch {
			return false;
		}
	}

	function writeInfoCollapsedPref(collapsed: boolean) {
		if (!browser) return;
		try {
			localStorage.setItem(INFO_COLLAPSED_KEY, collapsed ? '1' : '0');
		} catch {
			/* ignore quota / private mode */
		}
	}

	let activeSidebarTab = $state<SidebarTab>('information');
	/** When true, hide the details panel so the image fills the viewport. */
	let infoCollapsed = $state(false);

	$effect(() => {
		if (!browser) return;
		infoCollapsed = readInfoCollapsedPref();
	});

	function toggleInfoPanel() {
		infoCollapsed = !infoCollapsed;
		writeInfoCollapsedPref(infoCollapsed);
	}

	const sidebarTabs = $derived<SidebarTab[]>(
		isAdmin ? ['information', 'admin', 'shop'] : ['information', 'shop']
	);

	let {
		image,
		index,
		total,
		imageSrc,
		isLoaded: _isLoaded,
		placeholderSrc,
		onImageLoad,
		onClose,
		onPrevious,
		onNext,
		hasPrevious,
		hasNext,
		gallery,
		galleryImageId,
		useProxy,
		onMediaMetaUpdated
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
		onMediaMetaUpdated?: (patch: {
			alt: string;
			caption: GalleryImage['caption'] | null;
		}) => void;
	} = $props();

	const cmsImageEditHref = $derived(
		isAdmin && galleryImageId != null
			? `${PUBLIC_PAYLOAD_URL}/admin/collections/gallery-images/${galleryImageId}`
			: null
	);

	const isVideo = $derived(image ? isVideoMedia(image) : false);
	/** Prefer xlarge/large for paint; fall back to parent imageSrc / original. */
	const resolvedImageSrc = $derived(
		getLightboxPaintUrl(image, useProxy ?? false) ??
			imageSrc ??
			(image?.url ? getMediaUrl(image.url, useProxy ?? false) : null)
	);
	/** Full original for sharp zoom bitmap. */
	const zoomSourceSrc = $derived(
		getLightboxZoomUrl(image, useProxy ?? false) ?? resolvedImageSrc
	);
	/**
	 * Stable per-photo identity. Lightbox `index` shifts as polaroids resolve into the images
	 * array — resetting on index caused blur→loaded→blur pulsing for the same photo.
	 */
	const slideIdentity = $derived(galleryImageId ?? image?.id ?? null);
	/** Last identity we reset reveal UI for — ignore transient nulls and same-id churn. */
	let lastRevealIdentity: number | null = null;
	const zoomHandle: ImageZoomPanHandle = {
		reset: () => {},
		isZoomed: () => false
	};
	let imageZoomed = $state(false);
	let imagePaneEl = $state<HTMLDivElement | null>(null);
	let imageFrameEl = $state<HTMLDivElement | null>(null);
	let zoomCanvasEl = $state<HTMLCanvasElement | null>(null);
	let mainImageEl = $state<HTMLImageElement | null>(null);
	/** Scale needed for the image frame to cover the full image pane (fills letterbox bars). */
	let coverScale = $state(1);
	let zoomTransform = $state<ImageZoomPanTransform>({ scale: 1, tx: 0, ty: 0 });
	let zoomBitmap = $state<ImageBitmap | null>(null);
	let zoomBitmapLoading = $state(false);
	let zoomBitmapFailed = $state(false);
	let heldZoomBitmap: ImageBitmap | null = null;
	let zoomCanvasController: ReturnType<typeof createLightboxZoomCanvasController> | null = null;

	/** Canvas owns pixels once bitmap is ready and user is zoomed; CSS transform remains for hit-testing. */
	const sharpZoomActive = $derived(imageZoomed && zoomBitmap != null);

	function setZoomBitmap(next: ImageBitmap | null) {
		if (heldZoomBitmap && heldZoomBitmap !== next) {
			disposeZoomBitmap(heldZoomBitmap);
		}
		heldZoomBitmap = next;
		zoomBitmap = next;
	}

	function measureCoverScale() {
		const pane = imagePaneEl;
		const frame = imageFrameEl;
		if (!pane || !frame) return;
		const paneW = pane.clientWidth;
		const paneH = pane.clientHeight;
		const frameW = frame.clientWidth;
		const frameH = frame.clientHeight;
		if (paneW <= 0 || paneH <= 0 || frameW <= 0 || frameH <= 0) return;
		coverScale = Math.max(1, paneW / frameW, paneH / frameH);
	}

	function ensureZoomBitmap() {
		if (!browser || !zoomSourceSrc || zoomBitmap || zoomBitmapLoading || zoomBitmapFailed) return;
		const src = zoomSourceSrc;
		const imgEl = mainImageEl;
		zoomBitmapLoading = true;
		void loadZoomBitmap(src, imgEl)
			.then((bitmap) => {
				if (zoomSourceSrc !== src) {
					disposeZoomBitmap(bitmap);
					return;
				}
				setZoomBitmap(bitmap);
				zoomBitmapFailed = false;
				zoomCanvasController?.schedule();
			})
			.catch(() => {
				if (zoomSourceSrc === src) zoomBitmapFailed = true;
			})
			.finally(() => {
				if (zoomSourceSrc === src) zoomBitmapLoading = false;
			});
	}

	function onZoomChange(z: boolean) {
		imageZoomed = z;
		if (z) ensureZoomBitmap();
	}

	function onZoomTransform(t: ImageZoomPanTransform) {
		zoomTransform = t;
		if (t.scale > 1.001) ensureZoomBitmap();
		zoomCanvasController?.schedule();
	}

	$effect(() => {
		if (!browser) return;
		void index;
		void infoCollapsed;
		void resolvedImageSrc;
		measureCoverScale();
		const pane = imagePaneEl;
		const frame = imageFrameEl;
		if (!pane || !frame) return;
		const ro = new ResizeObserver(() => {
			measureCoverScale();
			zoomCanvasController?.schedule();
		});
		ro.observe(pane);
		ro.observe(frame);
		return () => ro.disconnect();
	});

	const imageZoomPanOptions = $derived({
		handle: zoomHandle,
		maxScale: Math.max(coverScale * 4, 8),
		// Progressive zoom — do not snap to coverScale (that felt like a horizontal stretch
		// when details are collapsed and side letterbars are large). Bars still fill as scale grows.
		clickZoomScale: 2.5,
		// Keep CSS transform so the frame's hit region scales with zoom; canvas paints sharp pixels on top.
		applyCssTransform: true,
		onZoomChange,
		onTransform: onZoomTransform
	});

	$effect(() => {
		if (!browser) return;
		zoomCanvasController = createLightboxZoomCanvasController(() => {
			const canvas = zoomCanvasEl;
			const pane = imagePaneEl;
			const frame = imageFrameEl;
			const bitmap = zoomBitmap;
			if (!canvas || !pane || !frame || !bitmap) return null;
			if (zoomTransform.scale <= 1.001) return null;
			const input: LightboxZoomCanvasPaintInput = {
				canvas,
				pane,
				frame,
				bitmap,
				transform: zoomTransform
			};
			return input;
		});
		return () => {
			zoomCanvasController?.destroy();
			zoomCanvasController = null;
		};
	});

	/**
	 * Reset zoom + load UI only when the photo identity changes (not lightbox index).
	 * Index shifts as the sparse galleryImages array densifies and must not re-flash blur.
	 */
	$effect(() => {
		if (!browser) return;
		const id = slideIdentity;
		if (id == null) return;
		setZoomBitmap(null);
		zoomBitmapLoading = false;
		zoomBitmapFailed = false;
		zoomTransform = { scale: 1, tx: 0, ty: 0 };
		zoomHandle.reset();
		imageZoomed = false;
		return () => {
			setZoomBitmap(null);
		};
	});

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
			image.sizes.thumbnail?.url ?? image.sizes.small?.url ?? image.sizes.medium?.url ?? null;
		return fallbackSize ? getMediaUrl(fallbackSize, useProxy ?? false) : null;
	});

	/** Load state for the main <img>; parent isLoaded probes src only and is not used here */
	let mainImageLoaded = $state(false);
	let mainImgReadyNotified = false;
	/**
	 * Placeholder layer stays mounted until reveal so `out:fade` can crossfade with the image.
	 * Reset on slide change; cleared in markMainImageReady once the full bitmap is decoded.
	 */
	let showPlaceholderOverlay = $state(true);

	/**
	 * Src painted in the <img>. Survives basic→full URL upgrades: we keep the current frame
	 * visible and swap only after the next URL is decoded (no spinner flash).
	 */
	let paintedImageSrc = $state<string | null>(null);

	$effect(() => {
		const id = slideIdentity;
		if (id == null) return;
		if (id === lastRevealIdentity) return;
		lastRevealIdentity = id;
		mainImageLoaded = false;
		paintedImageSrc = null;
		mainImgReadyNotified = false;
		showPlaceholderOverlay = true;
	});

	$effect(() => {
		const next = resolvedImageSrc;
		// Keep the last painted frame across transient gaps (images array reshuffle).
		if (!next) return;
		if (!paintedImageSrc) {
			paintedImageSrc = next;
			return;
		}
		if (next === paintedImageSrc) return;

		// Same slide, upgraded URL — preload then swap; keep reveal state so overlay stays off.
		let cancelled = false;
		const img = new Image();
		img.onload = () => {
			if (cancelled) return;
			void img
				.decode()
				.catch(() => {})
				.finally(() => {
					if (cancelled) return;
					paintedImageSrc = next;
					// Drop any zoom bitmap decoded from the previous URL so idle prefetch can rebuild.
					setZoomBitmap(null);
					zoomBitmapFailed = false;
					// Already revealed: do not re-open the placeholder overlay.
					if (!mainImgReadyNotified) markMainImageReady();
				});
		};
		img.onerror = () => {
			if (cancelled) return;
			paintedImageSrc = next;
			if (!mainImgReadyNotified) markMainImageReady();
		};
		img.src = next;
		return () => {
			cancelled = true;
		};
	});

	const showImageLoadingUi = $derived(!isVideo && showPlaceholderOverlay);

	function markMainImageReady() {
		if (mainImgReadyNotified) return;
		mainImgReadyNotified = true;
		mainImageLoaded = true;
		// Trigger placeholder outro (fade) while the full image fades in.
		showPlaceholderOverlay = false;
		onImageLoad();
	}

	/** Idle-prefetch zoom bitmap from the original after the lightbox img is ready. */
	$effect(() => {
		if (!browser || !mainImageLoaded || !zoomSourceSrc || zoomBitmap || zoomBitmapFailed) return;
		const src = zoomSourceSrc;
		const ric = window.requestIdleCallback?.bind(window);
		if (ric) {
			const id = ric(() => {
				if (zoomSourceSrc === src) ensureZoomBitmap();
			}, { timeout: 1500 });
			return () => window.cancelIdleCallback?.(id);
		}
		const t = setTimeout(() => {
			if (zoomSourceSrc === src) ensureZoomBitmap();
		}, 400);
		return () => clearTimeout(t);
	});

	$effect(() => {
		if (!sharpZoomActive) return;
		zoomCanvasController?.schedule();
	});

	/**
	 * Reveal only after the full file is fetched and decoded.
	 * Progressive JPEGs expose naturalWidth after the first scan — do not treat that as ready
	 * (that caused visible scan-line painting over the blurhash).
	 */
	function mainLightboxImage(node: HTMLImageElement) {
		let cleared = false;
		const timeouts: ReturnType<typeof setTimeout>[] = [];
		let settling = false;

		const settle = async () => {
			if (cleared || !node.isConnected || settling || mainImgReadyNotified) return;
			// complete === full download; naturalWidth alone is too early for progressive JPEG
			if (!node.complete || node.naturalWidth === 0) return;
			settling = true;
			try {
				if (typeof node.decode === 'function') {
					await node.decode();
				}
			} catch {
				/* decode can reject; still reveal if the file finished loading */
			}
			settling = false;
			if (cleared || !node.isConnected) return;
			if (node.complete && node.naturalWidth > 0) {
				markMainImageReady();
			}
		};

		const onLoad = () => void settle();
		node.addEventListener('load', onLoad);
		queueMicrotask(() => void settle());

		// Cached / 304 responses may skip `load`; poll briefly for complete+decode.
		for (const ms of [0, 50, 200, 500, 1200]) {
			timeouts.push(setTimeout(() => void settle(), ms));
		}

		return {
			destroy() {
				cleared = true;
				node.removeEventListener('load', onLoad);
				for (const t of timeouts) clearTimeout(t);
			}
		};
	}

	// Alt = image title; Lexical caption = description. Shown separately (not as fallbacks).
	// Filename-default alts are skipped — they aren't real titles.
	const imageTitle = $derived(displayableImageTitle(image?.alt, image?.filename));
	const captionText = $derived(image?.caption ? lexicalToPlainText(image.caption) : null);
	const hasLexicalCaption = $derived(Boolean(captionText && captionText.trim()));
	const shareTitle = $derived(imageTitle || captionText?.trim() || gallery.title || 'Gallery image');

	let editingMeta = $state(false);
	let draftAlt = $state('');
	let draftCaption = $state('');
	let metaSaveError = $state<string | null>(null);
	let metaSaving = $state(false);

	$effect(() => {
		void slideIdentity;
		editingMeta = false;
		metaSaveError = null;
		metaSaving = false;
	});

	function startEditingMeta() {
		draftAlt = image?.alt ?? '';
		draftCaption = captionText ?? '';
		metaSaveError = null;
		editingMeta = true;
	}

	function cancelEditingMeta() {
		editingMeta = false;
		metaSaveError = null;
	}

	async function saveMediaMeta() {
		if (!isAdmin || galleryImageId == null || metaSaving) return;
		metaSaving = true;
		metaSaveError = null;
		const caption = plainTextToLexical(draftCaption) as GalleryImage['caption'] | null;
		const alt = draftAlt.trim();
		try {
			const res = await fetch(`/api/gallery/images/${galleryImageId}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ alt, caption })
			});
			const payload = (await res.json().catch(() => null)) as {
				alt?: string;
				caption?: GalleryImage['caption'] | null;
				error?: string;
			} | null;
			if (!res.ok) {
				metaSaveError = payload?.error ?? `Save failed (${res.status})`;
				return;
			}
			onMediaMetaUpdated?.({
				alt: payload?.alt ?? alt,
				caption: payload?.caption ?? caption
			});
			editingMeta = false;
		} catch {
			metaSaveError = 'Could not save changes';
		} finally {
			metaSaving = false;
		}
	}

	// Commerce: Medusa is the source of truth. A for-sale image carries a live
	// Medusa variant id (resolved server-side) we can add to the cart.
	const commerce = $derived((image as { commerce?: GalleryCommerce | null } | undefined)?.commerce);
	const buyVariantId = $derived(
		commerce?.forSale && commerce?.variantId ? commerce.variantId : null
	);
	const buyPrice = $derived(typeof commerce?.priceUSD === 'number' ? commerce.priceUSD : null);

	const imageAspectRatio = $derived(image?.width && image?.height ? image.width / image.height : 1);

	const dimensionsLabel = $derived.by(() => {
		const w = image?.width;
		const h = image?.height;
		if (w == null || h == null || w <= 0 || h <= 0) return null;
		const mp = (w * h) / 1_000_000;
		const mpLabel = mp >= 10 ? mp.toFixed(0) : mp.toFixed(1);
		return `${w.toLocaleString()} × ${h.toLocaleString()} px (${mpLabel} MP)`;
	});

	// EXIF metadata: split into camera settings vs date/location
	type ExifItem = {
		label: string;
		value: string;
		icon:
			| 'camera'
			| 'lens'
			| 'aperture'
			| 'shutter'
			| 'iso'
			| 'focal'
			| 'program'
			| 'bias'
			| 'wb'
			| 'metering'
			| 'flash';
	};

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
			add(
				'Exposure bias',
				Number.isNaN(ev) ? bias : ev === 0 ? '0 EV' : `${ev > 0 ? '+' : ''}${ev} EV`,
				'bias'
			);
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

	let tracking = $state<GalleryImageTrackingCounts>(normalizeGalleryImageTracking(undefined));
	let userVote = $state<GalleryImageVote | null>(null);
	let trackingBusy = $state(false);

	const shareUrl = $derived.by(() => {
		if (!browser || !gallery.slug || galleryImageId == null) return '';
		const url = new URL(page.url);
		url.pathname = `/galleries/${gallery.slug}`;
		url.search = '';
		url.searchParams.set('selected', String(galleryImageId));
		return url.toString();
	});

	const metricItems = $derived([
		{ label: 'Views', value: tracking.views },
		{ label: 'Downloads', value: tracking.downloads },
		{ label: 'Shares', value: tracking.shares },
		{ label: 'Likes', value: tracking.likes },
		{ label: 'Dislikes', value: tracking.dislikes },
		{ label: 'Comments', value: tracking.comments }
	]);

	function setSidebarTab(tab: SidebarTab) {
		activeSidebarTab = tab;
	}

	function handleSidebarTablistKeydown(e: KeyboardEvent) {
		const tabs = sidebarTabs;
		const idx = tabs.indexOf(activeSidebarTab);
		if (idx < 0) return;
		if (e.key === 'ArrowRight') {
			activeSidebarTab = tabs[(idx + 1) % tabs.length];
		} else if (e.key === 'ArrowLeft') {
			activeSidebarTab = tabs[(idx + tabs.length - 1) % tabs.length];
		} else if (e.key === 'Home') {
			activeSidebarTab = tabs[0];
		} else if (e.key === 'End') {
			activeSidebarTab = tabs[tabs.length - 1];
		}
	}

	function applyTracking(next: GalleryImageTrackingCounts) {
		tracking = next;
	}

	async function trackEvent(event: Parameters<typeof recordGalleryImageTracking>[1]) {
		if (galleryImageId == null || trackingBusy) return;
		trackingBusy = true;
		try {
			const next = await recordGalleryImageTracking(galleryImageId, event);
			if (next) applyTracking(next);
		} finally {
			trackingBusy = false;
		}
	}

	function handleLike() {
		if (userVote != null) return;
		void trackEvent('like').then(() => {
			userVote = getStoredGalleryImageVote(galleryImageId ?? 0);
		});
	}

	function handleDislike() {
		if (userVote != null) return;
		void trackEvent('dislike').then(() => {
			userVote = getStoredGalleryImageVote(galleryImageId ?? 0);
		});
	}

	function handleShare() {
		void trackEvent('share');
	}

	$effect(() => {
		if (!sidebarTabs.includes(activeSidebarTab)) {
			activeSidebarTab = 'information';
		}
	});

	$effect(() => {
		const id = galleryImageId;
		activeSidebarTab = 'information';
		tracking = normalizeGalleryImageTracking(undefined);
		userVote = id != null ? getStoredGalleryImageVote(id) : null;
		if (!browser || id == null) return;

		let cancelled = false;
		void ensureGalleryImageTrackingOnOpen(id).then((counts) => {
			if (!cancelled && counts) applyTracking(counts);
		});

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="gallery-lightbox" style:--image-aspect-ratio={imageAspectRatio}>
	<div
		class="gallery-lightbox__body"
		class:gallery-lightbox__body--info-collapsed={infoCollapsed}
	>
		<!-- Image pane: grows to fill when the info panel is collapsed -->
		<div class="gallery-lightbox__image-pane" bind:this={imagePaneEl}>
			<button
				class="gallery-lightbox__backdrop"
				onclick={onClose}
				aria-label="Close lightbox"
				type="button"
			></button>

			<canvas
				class="gallery-lightbox__zoom-canvas"
				class:gallery-lightbox__zoom-canvas--active={sharpZoomActive}
				bind:this={zoomCanvasEl}
				aria-hidden="true"
			></canvas>

			<button
				class="gallery-lightbox__close"
				onclick={(e) => {
					e.stopPropagation();
					onClose();
				}}
				aria-label="Close lightbox"
				type="button"
			>
				<svg
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18"></line>
					<line x1="6" y1="6" x2="18" y2="18"></line>
				</svg>
			</button>

			<button
				class="gallery-lightbox__nav gallery-lightbox__nav--prev"
				class:gallery-lightbox__nav--disabled={!hasPrevious}
				disabled={!hasPrevious}
				onclick={(e) => {
					e.stopPropagation();
					onPrevious();
				}}
				aria-label="Previous image"
				type="button"
			>
				<svg
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="15 18 9 12 15 6"></polyline>
				</svg>
			</button>

			{#if isVideo && image}
				<div
					class="gallery-lightbox__image-frame"
					style:aspect-ratio={imageAspectRatio}
					role="presentation"
				>
					<GalleryMediaPlayer
						media={image}
						useProxy={useProxy ?? false}
						className="gallery-lightbox__video"
					/>
				</div>
			{:else}
				<div
					class="gallery-lightbox__image-frame gallery-lightbox__image-frame--zoomable"
					class:gallery-lightbox__image-frame--zoomed={imageZoomed}
					bind:this={imageFrameEl}
					style:aspect-ratio={imageAspectRatio}
					role="presentation"
					use:imageZoomPan={imageZoomPanOptions}
				>
					{#if showImageLoadingUi}
						<div
							class="gallery-lightbox__loading-overlay"
							out:fade={{ duration: IMAGE_REVEAL_MS, easing: cubicOut }}
							aria-busy={!mainImageLoaded}
							aria-label={mainImageLoaded ? undefined : 'Loading image'}
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
							{#if !mainImageLoaded}
								<div class="gallery-lightbox__spinner" aria-hidden="true"></div>
							{/if}
						</div>
					{/if}
					{#if paintedImageSrc}
						<img
							class="gallery-lightbox__image"
							class:gallery-lightbox__image--revealed={mainImageLoaded}
							class:gallery-lightbox__image--sharp-hidden={sharpZoomActive}
							bind:this={mainImageEl}
							use:mainLightboxImage
							src={paintedImageSrc}
							alt={image?.alt ?? ''}
							width={image?.width}
							height={image?.height}
							draggable="false"
							fetchpriority="high"
							decoding="async"
							onerror={markMainImageReady}
							oncontextmenu={preventContextMenu}
						/>
					{/if}
				</div>
			{/if}

			<button
				class="gallery-lightbox__nav gallery-lightbox__nav--next"
				class:gallery-lightbox__nav--disabled={!hasNext}
				disabled={!hasNext}
				onclick={(e) => {
					e.stopPropagation();
					onNext();
				}}
				aria-label="Next image"
				type="button"
			>
				<svg
					width="32"
					height="32"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="9 18 15 12 9 6"></polyline>
				</svg>
			</button>

			<p class="gallery-lightbox__counter">{index + 1} / {total}</p>
		</div>

		<!-- Seam handle between image and details -->
		<button
			class="gallery-lightbox__info-toggle"
			class:gallery-lightbox__info-toggle--collapsed={infoCollapsed}
			onclick={(e) => {
				e.stopPropagation();
				toggleInfoPanel();
			}}
			aria-label={infoCollapsed ? 'Show image details' : 'Hide image details'}
			aria-expanded={!infoCollapsed}
			aria-controls="gallery-lightbox-info"
			type="button"
			title={infoCollapsed ? 'Show details' : 'Hide details'}
		>
			<svg
				class="gallery-lightbox__info-toggle-chevron"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				{#if infoCollapsed}
					<polyline points="15 18 9 12 15 6"></polyline>
				{:else}
					<polyline points="9 18 15 12 9 6"></polyline>
				{/if}
			</svg>
			<span class="gallery-lightbox__info-toggle-label">
				{infoCollapsed ? 'Details' : 'Hide details'}
			</span>
		</button>

		<!-- Tabbed info panel (collapsible) -->
		<aside
			id="gallery-lightbox-info"
			class="gallery-lightbox__info"
			aria-hidden={infoCollapsed}
			inert={infoCollapsed || undefined}
		>
			<div
				class="gallery-lightbox__tabs"
				role="tablist"
				aria-label="Image details"
				tabindex="-1"
				onkeydown={handleSidebarTablistKeydown}
			>
				<button
					type="button"
					class="gallery-lightbox__tab"
					class:gallery-lightbox__tab--active={activeSidebarTab === 'information'}
					role="tab"
					id="gallery-lightbox-tab-information"
					aria-selected={activeSidebarTab === 'information'}
					aria-controls="gallery-lightbox-panel-information"
					tabindex={activeSidebarTab === 'information' ? 0 : -1}
					onclick={() => setSidebarTab('information')}
				>
					Information
				</button>
				{#if isAdmin}
					<button
						type="button"
						class="gallery-lightbox__tab"
						class:gallery-lightbox__tab--active={activeSidebarTab === 'admin'}
						role="tab"
						id="gallery-lightbox-tab-admin"
						aria-selected={activeSidebarTab === 'admin'}
						aria-controls="gallery-lightbox-panel-admin"
						tabindex={activeSidebarTab === 'admin' ? 0 : -1}
						onclick={() => setSidebarTab('admin')}
					>
						Admin
					</button>
				{/if}
				<button
					type="button"
					class="gallery-lightbox__tab"
					class:gallery-lightbox__tab--active={activeSidebarTab === 'shop'}
					role="tab"
					id="gallery-lightbox-tab-shop"
					aria-selected={activeSidebarTab === 'shop'}
					aria-controls="gallery-lightbox-panel-shop"
					tabindex={activeSidebarTab === 'shop' ? 0 : -1}
					onclick={() => setSidebarTab('shop')}
				>
					Shop
				</button>
			</div>

			<div class="gallery-lightbox__tab-panels">
				<div
					id="gallery-lightbox-panel-information"
					class="gallery-lightbox__tab-panel"
					role="tabpanel"
					aria-labelledby="gallery-lightbox-tab-information"
					hidden={activeSidebarTab !== 'information'}
				>
					{#if galleryImageId}
						<section class="gallery-lightbox__section gallery-lightbox__section--toolbar">
							<div class="gallery-lightbox__votes" role="group" aria-label="Rate this image">
								<button
									type="button"
									class="gallery-lightbox__vote"
									class:gallery-lightbox__vote--active={userVote === 'like'}
									class:gallery-lightbox__vote--settled={userVote != null}
									disabled={userVote != null || trackingBusy}
									aria-pressed={userVote === 'like'}
									aria-label="Like this image"
									onclick={handleLike}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
										<path
											d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"
											fill={userVote === 'like' ? 'currentColor' : 'none'}
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
								<button
									type="button"
									class="gallery-lightbox__vote"
									class:gallery-lightbox__vote--active={userVote === 'dislike'}
									class:gallery-lightbox__vote--settled={userVote != null}
									disabled={userVote != null || trackingBusy}
									aria-pressed={userVote === 'dislike'}
									aria-label="Dislike this image"
									onclick={handleDislike}
								>
									<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
										<path
											d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"
											fill={userVote === 'dislike' ? 'currentColor' : 'none'}
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</button>
							</div>

							{#if shareUrl}
								<span class="gallery-lightbox__toolbar-divider" aria-hidden="true"></span>
								<ShareButtons
									url={shareUrl}
									title={shareTitle}
									variant="on-dark"
									className="gallery-lightbox__share"
									onShare={handleShare}
								/>
							{/if}

							{#if cmsImageEditHref}
								<span class="gallery-lightbox__toolbar-divider" aria-hidden="true"></span>
								<a
									href={cmsImageEditHref}
									target="_blank"
									rel="noopener noreferrer"
									class="gallery-lightbox__edit-btn"
									aria-label="Edit image in CMS (opens in a new tab)"
									title="Edit in CMS"
								>
									<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
										<path
											d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
											fill="none"
											stroke="currentColor"
											stroke-width="2"
											stroke-linecap="round"
											stroke-linejoin="round"
										/>
									</svg>
								</a>
							{/if}
						</section>
					{/if}

					<section class="gallery-lightbox__section gallery-lightbox__section--about">
						<div class="gallery-lightbox__section-heading">
							<h3 class="gallery-lightbox__section-title">About</h3>
							{#if isAdmin && galleryImageId != null && !editingMeta}
								<button
									type="button"
									class="gallery-lightbox__meta-edit-btn"
									onclick={(e) => {
										e.stopPropagation();
										startEditingMeta();
									}}
								>
									Edit
								</button>
							{/if}
						</div>

						{#if isAdmin && editingMeta}
							<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
							<form
								class="gallery-lightbox__meta-form"
								onsubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									void saveMediaMeta();
								}}
								onclick={(e) => e.stopPropagation()}
								onkeydown={(e) => e.stopPropagation()}
							>
								<label class="gallery-lightbox__meta-field">
									<span class="gallery-lightbox__meta-field-label">Title</span>
									<input
										class="gallery-lightbox__meta-input"
										type="text"
										bind:value={draftAlt}
										disabled={metaSaving}
										autocomplete="off"
										placeholder="Short title for this image"
									/>
									<span class="gallery-lightbox__meta-hint">Stored as the image alt text</span>
								</label>
								<label class="gallery-lightbox__meta-field">
									<span class="gallery-lightbox__meta-field-label">Description</span>
									<textarea
										class="gallery-lightbox__meta-textarea"
										rows="4"
										bind:value={draftCaption}
										disabled={metaSaving}
										placeholder="Optional longer description"
									></textarea>
								</label>
								{#if metaSaveError}
									<p class="gallery-lightbox__meta-error" role="alert">{metaSaveError}</p>
								{/if}
								<div class="gallery-lightbox__meta-actions">
									<button
										type="submit"
										class="gallery-lightbox__meta-save"
										disabled={metaSaving}
									>
										{metaSaving ? 'Saving…' : 'Save'}
									</button>
									<button
										type="button"
										class="gallery-lightbox__meta-cancel"
										disabled={metaSaving}
										onclick={cancelEditingMeta}
									>
										Cancel
									</button>
								</div>
							</form>
						{:else if imageTitle || hasLexicalCaption}
							<div class="gallery-lightbox__about">
								{#if imageTitle}
									<p class="gallery-lightbox__image-title">{imageTitle}</p>
								{/if}
								{#if hasLexicalCaption && image?.caption}
									<blockquote class="gallery-lightbox__image-description">
										<Lexical data={image.caption} />
									</blockquote>
								{/if}
							</div>
						{:else}
							<p class="gallery-lightbox__section-text">—</p>
						{/if}
					</section>

					<section class="gallery-lightbox__section">
						<h3 class="gallery-lightbox__section-title">Image</h3>
						{#if dimensionsLabel}
							<div class="gallery-lightbox__meta-grid gallery-lightbox__meta-grid--single">
								<div class="gallery-lightbox__meta-item">
									<div class="gallery-lightbox__meta-icon">
										<ExifIcon icon="dimensions" />
									</div>
									<div class="gallery-lightbox__meta-content">
										<span class="gallery-lightbox__meta-label">Dimensions</span>
										<span class="gallery-lightbox__meta-value">{dimensionsLabel}</span>
									</div>
								</div>
							</div>
						{:else}
							<p class="gallery-lightbox__section-text">—</p>
						{/if}
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

					<section class="gallery-lightbox__section">
						<h3 class="gallery-lightbox__section-title">Albums</h3>
						<p class="gallery-lightbox__section-text">{gallery.title}</p>
					</section>
				</div>

				{#if isAdmin}
					<div
						id="gallery-lightbox-panel-admin"
						class="gallery-lightbox__tab-panel"
						role="tabpanel"
						aria-labelledby="gallery-lightbox-tab-admin"
						hidden={activeSidebarTab !== 'admin'}
					>
						{#if cmsImageEditHref}
							<section class="gallery-lightbox__section">
								<h3 class="gallery-lightbox__section-title">CMS</h3>
								<a
									href={cmsImageEditHref}
									target="_blank"
									rel="noopener noreferrer"
									class="gallery-lightbox__cms-edit-link"
									aria-label="Edit this image in the CMS (opens in a new tab)"
								>
									Edit in CMS
								</a>
							</section>
						{/if}
						<section class="gallery-lightbox__section">
							<h3 class="gallery-lightbox__section-title">Engagement</h3>
							<dl class="gallery-lightbox__metrics">
								{#each metricItems as { label, value } (label)}
									<div class="gallery-lightbox__metric">
										<dt class="gallery-lightbox__metric-label">{label}</dt>
										<dd class="gallery-lightbox__metric-value">{value}</dd>
									</div>
								{/each}
							</dl>
						</section>
					</div>
				{/if}

				<div
					id="gallery-lightbox-panel-shop"
					class="gallery-lightbox__tab-panel"
					role="tabpanel"
					aria-labelledby="gallery-lightbox-tab-shop"
					hidden={activeSidebarTab !== 'shop'}
				>
					<section class="gallery-lightbox__section">
						<h3 class="gallery-lightbox__section-title">Prints &amp; Products</h3>
						{#if buyVariantId}
							<p class="gallery-lightbox__section-text gallery-lightbox__shop-copy">
								Buy this image as a digital download.
							</p>
							<BuyButton
								variantId={buyVariantId}
								priceUSD={buyPrice}
								title={shareTitle}
							/>
						{:else}
							<p class="gallery-lightbox__section-text gallery-lightbox__shop-copy">
								This image isn't available for purchase right now. Check back later for ways to
								bring it home.
							</p>
						{/if}
					</section>
				</div>
			</div>
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
	.gallery-lightbox__info-toggle,
	.gallery-lightbox__nav,
	.gallery-lightbox__info {
		pointer-events: auto;
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

	/* Drawer seam between image and details panel */
	.gallery-lightbox__info-toggle {
		flex: 0 0 2.4rem;
		align-self: stretch;
		z-index: 12;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.65rem;
		margin: 0;
		padding: 0.5rem 0;
		border: none;
		border-left: 1px solid var(--color-tertiary-lighter);
		border-right: none;
		background: var(--color-tertiary-darker);
		color: var(--color-tertiary);
		cursor: pointer;
		transition:
			background 160ms ease,
			color 160ms ease,
			flex-basis 220ms ease;
	}

	.gallery-lightbox__info-toggle:hover {
		background: color-mix(in oklch, var(--color-tertiary-darker) 80%, black);
		color: var(--color-white-lightest);
	}

	.gallery-lightbox__info-toggle:focus {
		outline: none;
	}

	.gallery-lightbox__info-toggle:focus-visible {
		background: color-mix(in oklch, var(--color-tertiary-darker) 80%, black);
		color: var(--color-white-lightest);
		outline: 2px solid var(--color-secondary);
		outline-offset: -2px;
	}

	.gallery-lightbox__info-toggle--collapsed {
		flex-basis: 2.4rem;
		border-left: 1px solid var(--color-tertiary-lighter);
		color: var(--color-secondary);
	}

	.gallery-lightbox__info-toggle-chevron {
		flex-shrink: 0;
	}

	.gallery-lightbox__info-toggle-label {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-family: var(--font-roboto, system-ui, sans-serif);
		font-size: 0.8125rem;
		font-weight: 500;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		line-height: 1;
	}

	/* Image pane grows when the info panel collapses */
	.gallery-lightbox__image-pane {
		flex: 1 1 0;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 0;
		overflow: hidden;
		container-type: size;
		transition: flex-basis 220ms ease;
	}

	.gallery-lightbox__zoom-canvas {
		position: absolute;
		inset: 0;
		z-index: 1;
		width: 100%;
		height: 100%;
		pointer-events: none;
		opacity: 0;
	}

	.gallery-lightbox__zoom-canvas--active {
		opacity: 1;
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
		/* Explicit contain-fit in the pane so the box always matches image aspect
		   (width:100% / height:100% alone distort when the other axis clamps). */
		--_ar: var(--image-aspect-ratio, 1);
		width: min(100cqw, calc(100cqh * var(--_ar)));
		height: min(100cqh, calc(100cqw / var(--_ar)));
		max-width: 100%;
		max-height: 100%;
		overflow: hidden;
		z-index: 2;
		pointer-events: none;
		flex-shrink: 0;
	}

	.gallery-lightbox__image-frame--zoomable {
		pointer-events: auto;
		touch-action: none;
		user-select: none;
		-webkit-user-drag: none;
	}

	.gallery-lightbox__image-frame--zoomed {
		z-index: 2;
	}

	.gallery-lightbox__image-frame :global(.gallery-media-player),
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

	.gallery-lightbox__image {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
		pointer-events: none;
		opacity: 0;
		transition: opacity 320ms cubic-bezier(0.22, 1, 0.36, 1);
	}

	.gallery-lightbox__image--revealed {
		opacity: 1;
	}

	.gallery-lightbox__image--sharp-hidden {
		visibility: hidden;
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-lightbox__image {
			transition-duration: 1ms;
		}
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
		gap: 0.625rem;
		padding: 0.875rem 1rem;
		overflow-x: hidden;
		overflow-y: auto;
		background: var(--color-tertiary-darker);
		border-left: none;
		color: var(--color-white-lightest);
		font-family: var(--font-special-elite);
		animation: infoPaneFade 180ms ease;
		min-width: 0;
		transition:
			flex-basis 220ms ease,
			padding 220ms ease,
			opacity 180ms ease,
			border-color 180ms ease;
	}

	.gallery-lightbox__body--info-collapsed .gallery-lightbox__info {
		flex-basis: 0;
		flex-grow: 0;
		flex-shrink: 0;
		padding-left: 0;
		padding-right: 0;
		opacity: 0;
		pointer-events: none;
	}

	.gallery-lightbox__tabs {
		display: flex;
		gap: 0.375rem;
		padding: 0.25rem;
		border: 1px solid var(--color-tertiary-lighter);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.18);
	}

	.gallery-lightbox__tab {
		flex: 1 1 0;
		padding: 0.4375rem 0.625rem;
		border: none;
		border-radius: 6px;
		background: transparent;
		color: var(--color-tertiary);
		font-family: inherit;
		font-size: var(--fs-xs);
		font-weight: 600;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.gallery-lightbox__tab:hover,
	.gallery-lightbox__tab:focus-visible {
		color: var(--color-white-lightest);
		background: rgba(255, 255, 255, 0.06);
	}

	.gallery-lightbox__tab--active {
		color: var(--color-secondary);
		background: rgba(0, 0, 0, 0.28);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
	}

	.gallery-lightbox__tab-panels {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		min-height: 0;
	}

	.gallery-lightbox__tab-panel {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.gallery-lightbox__tab-panel[hidden] {
		display: none;
	}

	@keyframes infoPanelFade {
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

	.gallery-lightbox__section-title {
		font-size: var(--fs-xs);
		font-weight: 700;
		margin: 0;
		color: var(--color-secondary);
		padding-bottom: 0.375rem;
		border-bottom: 1px solid var(--color-tertiary-lighter);
	}

	.gallery-lightbox__section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.gallery-lightbox__section-heading .gallery-lightbox__section-title {
		flex: 1;
		margin: 0;
	}

	.gallery-lightbox__meta-edit-btn {
		flex-shrink: 0;
		margin: 0;
		padding: 0.2rem 0.55rem;
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.06);
		color: var(--color-secondary);
		font-family: var(--font-roboto, system-ui, sans-serif);
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		cursor: pointer;
	}

	.gallery-lightbox__meta-edit-btn:hover,
	.gallery-lightbox__meta-edit-btn:focus-visible {
		outline: none;
		border-color: var(--color-secondary);
		background: rgba(255, 255, 255, 0.1);
	}

	.gallery-lightbox__meta-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.gallery-lightbox__meta-field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.gallery-lightbox__meta-field-label {
		font-size: 0.6875rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-tertiary);
	}

	.gallery-lightbox__meta-hint {
		font-size: 0.6875rem;
		line-height: 1.35;
		color: rgba(255, 255, 255, 0.45);
	}

	.gallery-lightbox__about {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.gallery-lightbox__image-title {
		margin: 0;
		font-family: var(--font-permanent-marker), cursive;
		font-size: var(--fs-xs);
		font-weight: 400;
		font-style: normal;
		letter-spacing: 0.02em;
		line-height: 1.35;
		color: rgba(255, 255, 255, 0.72);
		text-wrap: pretty;
	}

	.gallery-lightbox__image-description {
		margin: 0;
		padding: 0.55rem 0.7rem 0.55rem 0.85rem;
		border-left: 2px solid var(--color-secondary);
		background: rgba(0, 0, 0, 0.28);
		box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.05);
		border-radius: 0 4px 4px 0;
		font-family: var(--font-crimson-text, Georgia, serif);
		font-size: var(--fs-xs);
		font-style: italic;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.85);
	}

	.gallery-lightbox__image-description :global(p) {
		margin: 0 0 0.5rem;
		line-height: 1.45;
		color: inherit;
		font: inherit;
	}

	.gallery-lightbox__image-description :global(p:last-child) {
		margin-bottom: 0;
	}

	.gallery-lightbox__meta-input,
	.gallery-lightbox__meta-textarea {
		width: 100%;
		box-sizing: border-box;
		margin: 0;
		padding: 0.5rem 0.65rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 4px;
		background: rgba(0, 0, 0, 0.35);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto, system-ui, sans-serif);
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.gallery-lightbox__meta-textarea {
		resize: vertical;
		min-height: 5.5rem;
		font-family: var(--font-crimson-text, Georgia, serif);
	}

	.gallery-lightbox__meta-input:focus-visible,
	.gallery-lightbox__meta-textarea:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 1px;
	}

	.gallery-lightbox__meta-error {
		margin: 0;
		font-size: 0.8125rem;
		color: #f0a0a0;
	}

	.gallery-lightbox__meta-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.gallery-lightbox__meta-save,
	.gallery-lightbox__meta-cancel {
		margin: 0;
		padding: 0.4rem 0.85rem;
		border-radius: 4px;
		font-family: var(--font-roboto, system-ui, sans-serif);
		font-size: 0.8125rem;
		font-weight: 600;
		cursor: pointer;
	}

	.gallery-lightbox__meta-save {
		border: 1px solid var(--color-secondary);
		background: color-mix(in oklch, var(--color-secondary) 28%, transparent);
		color: var(--color-secondary);
	}

	.gallery-lightbox__meta-cancel {
		border: 1px solid rgba(255, 255, 255, 0.2);
		background: transparent;
		color: var(--color-white-lightest);
	}

	.gallery-lightbox__meta-save:disabled,
	.gallery-lightbox__meta-cancel:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.gallery-lightbox__edit-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.72);
		text-decoration: none;
		flex-shrink: 0;
		transition:
			border-color 150ms ease,
			background 150ms ease,
			color 150ms ease;
	}

	.gallery-lightbox__edit-btn:hover,
	.gallery-lightbox__edit-btn:focus-visible {
		border-color: rgba(255, 255, 255, 0.28);
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-secondary);
	}

	.gallery-lightbox__cms-edit-link {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.45rem 0.9rem;
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.06);
		font-family: var(--font-roboto, system-ui, sans-serif);
		font-size: 0.8125rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-secondary);
		text-decoration: none;
		transition:
			border-color 150ms ease,
			background 150ms ease,
			color 150ms ease;
	}

	.gallery-lightbox__cms-edit-link:hover,
	.gallery-lightbox__cms-edit-link:focus-visible {
		border-color: rgba(255, 255, 255, 0.35);
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-white-lightest);
	}

	.gallery-lightbox__section-text {
		font-size: var(--fs-xs);
		line-height: 1.35;
		margin: 0;
		color: var(--color-white-lightest);
	}

	.gallery-lightbox__meta-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem 0.875rem;
	}

	.gallery-lightbox__meta-grid--single {
		grid-template-columns: 1fr;
	}

	.gallery-lightbox__meta-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
		font-size: calc(var(--fs-xs) * 0.92);
		color: var(--color-tertiary);
		font-weight: 500;
		line-height: 1.2;
	}

	.gallery-lightbox__meta-value {
		font-size: var(--fs-xs);
		color: var(--color-white-lightest);
		line-height: 1.2;
	}

	.gallery-lightbox__section--toolbar {
		flex-direction: row;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		flex-wrap: nowrap;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.gallery-lightbox__section--toolbar::-webkit-scrollbar {
		display: none;
	}

	.gallery-lightbox__toolbar-divider {
		width: 1px;
		align-self: center;
		height: 1.25rem;
		background: rgba(255, 255, 255, 0.16);
		flex-shrink: 0;
	}

	.gallery-lightbox__votes {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		flex-shrink: 0;
	}

	.gallery-lightbox__info :global(.gallery-lightbox__share.share-buttons) {
		margin: 0;
		min-width: 0;
		flex: 0 0 auto;
		flex-wrap: nowrap;
		gap: 0.375rem;
	}

	.gallery-lightbox__vote {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.72);
		cursor: pointer;
		transition:
			border-color 150ms ease,
			background 150ms ease,
			color 150ms ease,
			opacity 150ms ease;
	}

	.gallery-lightbox__vote:hover:not(:disabled) {
		border-color: rgba(255, 255, 255, 0.28);
		background: rgba(255, 255, 255, 0.12);
		color: var(--color-white-lightest);
	}

	.gallery-lightbox__vote--active {
		border-color: var(--color-secondary);
		background: rgba(255, 255, 255, 0.1);
		color: var(--color-secondary);
	}

	.gallery-lightbox__vote--settled:not(.gallery-lightbox__vote--active) {
		opacity: 0.35;
	}

	.gallery-lightbox__vote:disabled {
		cursor: default;
	}

	.gallery-lightbox__shop-copy {
		color: var(--color-tertiary);
	}

	.gallery-lightbox__metrics {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin: 0;
	}

	.gallery-lightbox__metric {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		padding: 0.5rem 0.625rem;
		border: 1px solid var(--color-tertiary-lighter);
		border-radius: 8px;
		background: rgba(0, 0, 0, 0.18);
	}

	.gallery-lightbox__metric-label,
	.gallery-lightbox__metric-value {
		margin: 0;
	}

	.gallery-lightbox__metric-label {
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		font-weight: 500;
	}

	.gallery-lightbox__metric-value {
		font-size: 1.25rem;
		line-height: 1.1;
		color: var(--color-white-lightest);
		font-variant-numeric: tabular-nums;
		font-weight: 700;
	}

	@media (max-width: 768px) {
		.gallery-lightbox__body {
			flex-direction: column;
		}

		.gallery-lightbox__image-pane {
			flex: 1 1 auto;
			min-height: 50vh;
		}

		.gallery-lightbox__info-toggle {
			flex: 0 0 2rem;
			flex-direction: row;
			gap: 0.45rem;
			border-left: none;
			border-top: 1px solid var(--color-tertiary-lighter);
			padding: 0.35rem 0.75rem;
		}

		.gallery-lightbox__info-toggle--collapsed {
			flex-basis: 2.5rem;
		}

		.gallery-lightbox__info-toggle-chevron {
			transform: rotate(90deg);
		}

		.gallery-lightbox__info-toggle-label {
			writing-mode: horizontal-tb;
			letter-spacing: 0.06em;
		}

		.gallery-lightbox__info {
			flex: 0 0 auto;
			max-height: 45vh;
			border-top: none;
		}

		.gallery-lightbox__body--info-collapsed .gallery-lightbox__image-pane {
			min-height: 0;
			flex: 1 1 100%;
		}

		.gallery-lightbox__body--info-collapsed .gallery-lightbox__info {
			flex-basis: 0;
			max-height: 0;
			padding-top: 0;
			padding-bottom: 0;
			overflow: hidden;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.gallery-lightbox__spinner {
			animation: none;
			border-top-color: rgba(255, 255, 255, 0.6);
		}

		.gallery-lightbox__image-pane,
		.gallery-lightbox__info {
			transition: none;
		}
	}
</style>
