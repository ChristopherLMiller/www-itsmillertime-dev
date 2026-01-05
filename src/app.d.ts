// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	interface DisqusConfig {
		page: {
			identifier: string;
			title: string;
			url: string;
		};
	}

	interface Window {
		DISQUS?: {
			reset: (options: { reload: boolean; config: (this: DisqusConfig) => void }) => void;
		};
		disqus_config?: (this: DisqusConfig) => void;
	}
}

export {};
