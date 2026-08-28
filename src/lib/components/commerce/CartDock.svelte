<script lang="ts">
	import { onMount } from 'svelte';
	import { cartUi, hydrateCartSession } from '$lib/commerce/cart-session.svelte';
	import { SHOP_CART_WINDOW } from '$lib/commerce/cart-session';

	onMount(() => {
		void hydrateCartSession();

		function onVisible() {
			if (document.visibilityState === 'visible') void hydrateCartSession();
		}

		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});

	const countLabel = $derived(cartUi.itemCount === 1 ? '1 item' : `${cartUi.itemCount} items`);
	const addedLabel = $derived(
		cartUi.addedQty <= 0
			? null
			: cartUi.addedQty === 1
				? 'Added to cart'
				: `Added ${cartUi.addedQty} items`
	);
</script>

{#if cartUi.itemCount > 0 && cartUi.cartUrl}
	<div class="cart-dock">
		{#if addedLabel}
			<p class="cart-dock__added" aria-live="polite">{addedLabel}</p>
		{/if}
		<a
			class="cart-dock__link"
			href={cartUi.cartUrl}
			target={SHOP_CART_WINDOW}
			rel="noreferrer"
			aria-label="View cart, {countLabel}"
		>
			<span class="cart-dock__label">View cart</span>
			<span class="cart-dock__count">{cartUi.itemCount}</span>
		</a>
	</div>
{/if}

<style>
	.cart-dock {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		justify-content: center;
		align-self: flex-start;
		height: var(--top-bar-height);
		position: relative;
	}

	.cart-dock__added {
		position: absolute;
		top: calc(100% + 0.35rem);
		right: 0;
		z-index: 1;
		margin: 0;
		padding: 0.35rem 0.65rem;
		border-radius: 6px;
		background: color-mix(in oklch, var(--color-tertiary-darkest) 88%, transparent);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: 0.75rem;
		line-height: 1.3;
		white-space: nowrap;
		pointer-events: none;
	}

	.cart-dock__link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0;
		padding: 0.55rem 0.85rem;
		border: 1px solid var(--color-secondary);
		border-radius: 8px;
		background: var(--color-secondary);
		color: var(--color-tertiary-darker);
		font-family: var(--font-oswald);
		font-size: 0.8rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
		box-shadow: var(--box-shadow-elev-1);
		white-space: nowrap;
		line-height: 1;
	}

	.cart-dock__link:hover {
		filter: brightness(1.08);
	}

	.cart-dock__link:focus-visible {
		outline: 2px solid var(--color-white-lightest);
		outline-offset: 2px;
	}

	.cart-dock__count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.35rem;
		padding: 0.1em 0.4em;
		border-radius: 999px;
		background: var(--color-tertiary-darker);
		color: var(--color-secondary);
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}
</style>
