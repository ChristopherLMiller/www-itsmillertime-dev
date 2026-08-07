import { browser } from '$app/environment';

const FOOTER_VERSION_SELECTOR = '[data-site-footer-version]';
const HTML_CLASS = 'footer-version-bar-visible';

let observer: IntersectionObserver | null = null;
let observedEl: Element | null = null;
let refCount = 0;

function setVisible(visible: boolean) {
	document.documentElement.classList.toggle(HTML_CLASS, visible);
}

/**
 * Keep fixed corner chrome (scroll-to-top, admin tab) hugged to the viewport
 * bottom until the footer version bar intersects, then lift above it.
 * Call from an `$effect` and return the disposer.
 */
export function watchFooterVersionBar(): () => void {
	if (!browser) return () => {};

	refCount += 1;

	const bind = (el: Element) => {
		if (observedEl === el && observer) return;
		observer?.disconnect();
		observedEl = el;
		observer = new IntersectionObserver(
			([entry]) => {
				setVisible(!!entry?.isIntersecting);
			},
			{ root: null, threshold: 0 }
		);
		observer.observe(el);
		// Sync immediately in case the bar is already on-screen.
		const rect = el.getBoundingClientRect();
		setVisible(rect.top < window.innerHeight && rect.bottom > 0);
	};

	const existing = document.querySelector(FOOTER_VERSION_SELECTOR);
	if (existing) bind(existing);

	const mo = new MutationObserver(() => {
		const el = document.querySelector(FOOTER_VERSION_SELECTOR);
		if (el) bind(el);
	});
	mo.observe(document.body, { childList: true, subtree: true });

	return () => {
		refCount = Math.max(0, refCount - 1);
		mo.disconnect();
		if (refCount === 0) {
			observer?.disconnect();
			observer = null;
			observedEl = null;
			setVisible(false);
		}
	};
}
