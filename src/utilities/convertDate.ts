import { Temporal } from '@js-temporal/polyfill';

export function convertDate(dateStr: string | null): string {
	if (!dateStr) return 'Invalid Date';
	try {
		const date = Temporal.Instant.from(dateStr);

		return date.toLocaleString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	} catch (error) {
		console.error('Error converting date:', error);
		return 'Invalid Date';
	}
}
