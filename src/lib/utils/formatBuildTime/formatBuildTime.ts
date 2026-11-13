/**
 * Format a model's total tracked seconds as decimal hours, e.g. 5400 -> "1.5 Hours".
 * Returns null when there is no tracked time to show.
 */
export function formatBuildTime(totalSeconds: number | null | undefined): string | null {
	if (typeof totalSeconds !== 'number' || !Number.isFinite(totalSeconds) || totalSeconds <= 0) {
		return null;
	}
	return `${(totalSeconds / 3600).toFixed(1)} Hours`;
}
