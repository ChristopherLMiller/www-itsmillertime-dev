/**
 * Context bridge so shared chrome (Navigation, Meta, Header, TopBar) can read
 * the layout globals (navigation + siteMeta) from the TanStack layout query
 * instead of `page.data`. Consumers fall back to `page.data` when no provider
 * is present (e.g. isolated Storybook rendering).
 */
import { getContext, setContext } from 'svelte';
import type { SiteMeta, SiteNavigation } from '$lib/types/payload-types';

export interface SiteLayoutData {
	navigation: SiteNavigation | undefined;
	siteMeta: SiteMeta | undefined;
}

const SITE_LAYOUT_KEY = Symbol('site-layout');

/** Store a reactive accessor; call inside a component's init. */
export function setSiteLayoutContext(accessor: () => SiteLayoutData): void {
	setContext(SITE_LAYOUT_KEY, accessor);
}

/** Retrieve the accessor, or undefined when rendered outside the provider. */
export function getSiteLayoutContext(): (() => SiteLayoutData) | undefined {
	return getContext<(() => SiteLayoutData) | undefined>(SITE_LAYOUT_KEY);
}
