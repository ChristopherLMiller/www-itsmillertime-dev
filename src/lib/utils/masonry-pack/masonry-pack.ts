import type { Action } from 'svelte/action';

const ROW_HEIGHT_PX = 8;

export function nativeMasonrySupported(): boolean {
	if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return false;
	return (
		CSS.supports('display', 'grid-lanes') ||
		CSS.supports('display', 'masonry') ||
		CSS.supports('grid-template-rows', 'masonry')
	);
}

/** Dense-pack row span for the CSS grid masonry fallback. */
export function masonryRowSpan(height: number, rowHeight = ROW_HEIGHT_PX, gap = 0): number {
	if (!Number.isFinite(height) || height <= 0) return 1;
	const row = rowHeight > 0 ? rowHeight : ROW_HEIGHT_PX;
	const g = Number.isFinite(gap) && gap > 0 ? gap : 0;
	return Math.max(1, Math.ceil((height + g) / (row + g)));
}

function rowGapPx(node: HTMLElement): number {
	const gap = parseFloat(getComputedStyle(node).rowGap);
	return Number.isFinite(gap) ? gap : 0;
}

function contentHeight(child: HTMLElement): number {
	let max = child.scrollHeight;
	for (const inner of child.children) {
		if (inner instanceof HTMLElement) {
			max = Math.max(max, inner.offsetHeight, inner.scrollHeight);
		}
	}
	return max;
}

function pack(node: HTMLElement) {
	const gap = rowGapPx(node);
	for (const child of node.children) {
		if (!(child instanceof HTMLElement)) continue;
		const height = contentHeight(child);
		child.style.gridRowEnd = `span ${masonryRowSpan(height, ROW_HEIGHT_PX, gap)}`;
	}
}

/**
 * When native CSS masonry / grid-lanes is unavailable, pack children by
 * spanning implicit grid rows. No remounts. Skip when the browser already
 * implements the layout.
 */
export const masonryPack: Action<HTMLElement> = (node) => {
	if (nativeMasonrySupported()) return {};

	const previousAutoRows = node.style.gridAutoRows;
	const previousAlign = node.style.alignItems;
	node.style.gridAutoRows = `${ROW_HEIGHT_PX}px`;
	node.style.alignItems = 'stretch';
	node.dataset.masonryPack = '';

	let raf = 0;
	function schedule() {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			pack(node);
		});
	}

	const ro = new ResizeObserver(() => schedule());
	ro.observe(node);

	function observeChildren() {
		for (const child of node.children) {
			if (!(child instanceof HTMLElement)) continue;
			ro.observe(child);
			if (child.firstElementChild instanceof HTMLElement) {
				ro.observe(child.firstElementChild);
			}
		}
	}

	observeChildren();
	const mo = new MutationObserver(() => {
		observeChildren();
		schedule();
	});
	mo.observe(node, { childList: true });
	schedule();

	return {
		destroy() {
			if (raf) cancelAnimationFrame(raf);
			ro.disconnect();
			mo.disconnect();
			node.style.gridAutoRows = previousAutoRows;
			node.style.alignItems = previousAlign;
			delete node.dataset.masonryPack;
			for (const child of node.children) {
				if (child instanceof HTMLElement) child.style.gridRowEnd = '';
			}
		}
	};
}
