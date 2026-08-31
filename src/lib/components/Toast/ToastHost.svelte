<script lang="ts">
	import { dismissToast, toastState } from '$lib/toast/toast.svelte';

	const items = $derived(toastState.items);
</script>

<div class="toast-host" aria-live="polite" aria-relevant="additions">
	{#each items as item (item.id)}
		<div class="toast toast--{item.variant}" role="status">
			<p class="toast__message">{item.message}</p>
			<button
				type="button"
				class="toast__dismiss"
				aria-label="Dismiss"
				onclick={() => dismissToast(item.id)}
			>
				×
			</button>
		</div>
	{/each}
</div>

<style lang="postcss">
	.toast-host {
		position: fixed;
		z-index: 10050;
		inset-inline: 0;
		bottom: max(1rem, env(safe-area-inset-bottom, 0px));
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		pointer-events: none;
		padding-inline: 1rem;
	}

	.toast {
		pointer-events: auto;
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		max-width: min(28rem, 100%);
		padding: 0.75rem 0.85rem 0.75rem 1rem;
		border: var(--border-width) solid var(--color-primary-darker);
		background: var(--color-white) var(--linen-paper);
		color: var(--color-tertiary-darker);
		font-family: var(--font-oswald);
		font-size: var(--fs-s);
		line-height: 1.35;
		box-shadow: var(--box-shadow-elev-1);
		animation: toast-in 180ms ease;
	}

	.toast--success {
		border-color: color-mix(in oklch, var(--color-primary) 55%, var(--color-primary-darker));
	}

	.toast--error {
		border-color: color-mix(in oklch, var(--color-primary) 70%, transparent);
		background: color-mix(in oklch, var(--color-primary-lighter) 35%, var(--color-white));
	}

	.toast__message {
		margin: 0;
		flex: 1;
	}

	.toast__dismiss {
		flex-shrink: 0;
		margin: 0;
		padding: 0 0.15rem;
		border: none;
		background: transparent;
		color: inherit;
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		opacity: 0.7;
	}

	.toast__dismiss:hover {
		opacity: 1;
	}

	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(0.5rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
