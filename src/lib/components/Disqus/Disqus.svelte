<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';

	type DisqusProps = {
		identifier: string;
		title: string;
		url: string;
	};

	const { identifier, title, url }: DisqusProps = $props();

	const shortname = 'itsmillertimedev';

	let wrapperEl: HTMLDivElement | undefined = $state();

	function mountDisqus() {
		if (!browser) return;

		// Prevent duplicate embeds during navigation
		if (window.DISQUS) {
			window.DISQUS.reset({
				reload: true,
				config: function () {
					this.page.identifier = identifier;
					this.page.title = title;
					this.page.url = url;
				}
			});
			return;
		}

		window.disqus_config = function () {
			this.page.identifier = identifier;
			this.page.title = title;
			this.page.url = url;
		};

		const d = document;
		const s = d.createElement('script');
		s.src = `https://${shortname}.disqus.com/embed.js`;
		s.setAttribute('data-timestamp', Date.now().toString());
		s.async = true;
		d.body.appendChild(s);
	}

	onMount(() => {
		if (!browser || !wrapperEl) return;

		// Below-fold: only inject when near viewport so late iframe growth
		// doesn't compete with above-the-fold CLS measurement.
		const observer = new IntersectionObserver(
			(entries) => {
				if (!entries.some((entry) => entry.isIntersecting)) return;
				observer.disconnect();
				mountDisqus();
			},
			{ rootMargin: '200px 0px' }
		);
		observer.observe(wrapperEl);

		return () => observer.disconnect();
	});
</script>

<div class="disqus-wrapper" bind:this={wrapperEl}>
	<div id="disqus_thread"></div>
</div>

<style lang="postcss">
	.disqus-wrapper {
		background: rgba(228, 228, 228, 1);
		color: rgb(100, 26, 18, 1);
		border: var(--border-width) solid var(--color-tertiary);
		border-radius: 4px;
		padding: 1rem;
		/* Reserve space so embed load doesn't shove the footer */
		min-height: 24rem;

		:global(a) {
			background: rgba(228, 228, 228, 1);
			color: rgb(100, 26, 18, 1);
		}
	}

	#disqus_thread {
		min-height: 20rem;
	}
</style>
