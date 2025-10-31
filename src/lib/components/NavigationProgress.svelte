<script lang="ts">
	import { afterNavigate, beforeNavigate } from '$app/navigation';
	import { onMount } from 'svelte';

	let progress = $state(0);
	let isVisible = $state(false);
	let intervalId: ReturnType<typeof setInterval> | null = null;

	beforeNavigate(() => {
		isVisible = true;
		progress = 0;

		intervalId = setInterval(() => {
			progress += Math.random() * 15;
			if (progress > 90) {
				progress = 90;
			}
		}, 100);
	});

	afterNavigate(() => {
		progress = 100;
		isVisible = false;
		setTimeout(() => {
			isVisible = false;
			progress = 0;
		}, 200);
	});

	onMount(() => {
		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	});
</script>

{#if isVisible}
	<div class="navigation-progress" style="width: {progress}%"></div>
{/if}

<style lang="postcss">
	.navigation-progress {
		position: fixed;
		top: 0;
		left: 0;
		height: 3px;
		background: linear-gradient(
			90deg,
			var(--color-primary) 0%,
			var(--color-secondary) 50%,
			var(--color-primary) 100%
		);
		z-index: 10000;
		transition: width 0.2s ease-out;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
		background-size: 200% 100%;
		animation: shimmer 2s ease-in-out infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: -200% 0;
		}
		100% {
			background-position: 200% 0;
		}
	}

	/* Ensure it appears above the top bar */
	.navigation-progress {
		z-index: 10001;
	}
</style>
