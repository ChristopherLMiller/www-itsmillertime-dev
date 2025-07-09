<script lang="ts">
	let { navItem } = $props();
	import { page } from '$app/state';
</script>

<a href={navItem.link} class={`${navItem.link === page.url.pathname ? 'active' : ''}`}>
	{#if navItem.icon}
		<img
			src={`https://pub-19ff55b8f4194790aa694b0fc00770a9.r2.dev/${navItem.icon.url.split('/').pop()}`}
			alt={navItem.title}
		/>
	{/if}
	{navItem.title}
</a>

<style lang="postcss">
	a {
		min-width: 175px;
		color: var(--color-white);
		text-decoration: none;
		font-family: var(--font-source-code-pro);
		font-weight: 300;
		padding: 0.5rem 1rem;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		position: relative;
		background: var(--color-secondary-darker);
		box-shadow: var(--box-shadow-elev-0);
		transition: all 0.2s cubic-bezier(0.6, -0.28, 0.74, 0.05);

		&.active {
			background: var(--color-secondary);
			box-shadow: var(--box-shadow-elev-0);
		}

		&:hover {
			box-shadow:
				7px -7px var(--color-primary-darker),
				var(--box-shadow-elev-1);
			transform: translateX(-7px) translateY(7px);
			background: var(--color-secondary);
			z-index: 1;
		}

		img {
			width: 30px;
			height: 30px;
		}
	}
</style>
