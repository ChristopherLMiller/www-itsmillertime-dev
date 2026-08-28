<script lang="ts">
	import { addVariantToCart } from '$lib/commerce/add-to-cart';
	import { cartUi } from '$lib/commerce/cart-session.svelte';
	import { SHOP_CART_WINDOW } from '$lib/commerce/cart-session';
	import { formatUsd } from '$lib/commerce/shop-offers';

	interface Props {
		variantId: string;
		priceUSD?: number | null;
		title?: string;
	}

	let { variantId, priceUSD = null, title = '' }: Props = $props();

	let busy = $state(false);
	let errorMsg = $state<string | null>(null);
	let justAdded = $state(false);

	const priceLabel = $derived(typeof priceUSD === 'number' ? formatUsd(priceUSD) : null);

	async function addToCart() {
		if (busy) return;
		busy = true;
		errorMsg = null;
		justAdded = false;
		try {
			const summary = await addVariantToCart(variantId);
			justAdded = true;
			if (!summary.cartUrl) {
				errorMsg = 'Added to cart, but the shop URL is not configured.';
			}
		} catch {
			errorMsg = 'Could not add to cart. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

<div class="buy">
	{#if title}
		<p class="buy__title">{title}</p>
	{/if}
	{#if priceLabel}
		<p class="buy__price">{priceLabel}</p>
	{/if}
	<button class="buy__btn" type="button" onclick={addToCart} disabled={busy}>
		{busy ? 'Adding…' : justAdded ? 'Added to cart' : 'Add to cart'}
	</button>
	{#if cartUi.itemCount > 0 && cartUi.cartUrl}
		<a class="buy__cart" href={cartUi.cartUrl} target={SHOP_CART_WINDOW} rel="noreferrer">
			View cart · {cartUi.itemCount}
			{cartUi.itemCount === 1 ? 'item' : 'items'}
		</a>
	{/if}
	{#if errorMsg}
		<p class="buy__error" role="alert">{errorMsg}</p>
	{/if}
</div>

<style>
	.buy {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.buy__title {
		margin: 0;
		font-size: var(--fs-xs);
		color: var(--color-white-lightest);
	}

	.buy__price {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--color-secondary);
		font-variant-numeric: tabular-nums;
	}

	.buy__btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0.625rem 1rem;
		border: 1px solid var(--color-secondary);
		border-radius: 8px;
		background: var(--color-secondary);
		color: var(--color-tertiary-darker);
		font-family: inherit;
		font-size: var(--fs-xs);
		font-weight: 700;
		letter-spacing: 0.02em;
		cursor: pointer;
		transition:
			opacity 150ms ease,
			background 150ms ease;
	}

	.buy__btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.buy__btn:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.buy__cart {
		color: var(--color-secondary);
		font-size: calc(var(--fs-xs) * 0.92);
		text-decoration: none;
	}

	.buy__cart:hover {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.buy__error {
		margin: 0;
		font-size: calc(var(--fs-xs) * 0.92);
		color: #ff6b6b;
	}
</style>
