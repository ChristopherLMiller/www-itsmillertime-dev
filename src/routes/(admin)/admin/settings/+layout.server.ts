import { SettingsEncryptionError } from '$lib/settings/encryption.server';
import { loadSiteSettings } from '$lib/settings/site-settings.server';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, request }) => {
	try {
		const settings = await loadSiteSettings(fetch, request);
		return { settings, loadError: null as string | null };
	} catch (err) {
		if (err instanceof SettingsEncryptionError) {
			return { settings: null, loadError: err.message };
		}
		return { settings: null, loadError: 'Failed to load site settings' };
	}
};
