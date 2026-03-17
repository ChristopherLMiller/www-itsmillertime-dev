import { writable } from 'svelte/store';

/**
 * Set to true before calling invalidate() for a background/silent data refresh.
 * The NavigationProgress component reads this to suppress the loading bar.
 */
export const isSilentRefresh = writable(false);
