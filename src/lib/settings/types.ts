import type { SitePrompt } from './prompts';

export type SiteSettingsView = {
	ai: {
		provider: 'anthropic' | 'openai';
		model: string;
		apiKey: string;
		prompts: SitePrompt[];
	};
	lastfm: {
		username: string;
		apiKey: string;
	};
	email: {
		resendApiKey: string;
		fromAddress: string;
		fromName: string;
	};
};

export type SiteSettingsPatch = {
	ai?: SiteSettingsView['ai'];
	lastfm?: SiteSettingsView['lastfm'];
	email?: SiteSettingsView['email'];
};

