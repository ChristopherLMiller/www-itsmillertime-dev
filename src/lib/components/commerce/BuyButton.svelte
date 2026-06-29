<script lang="ts">
	interface Props {
		variantId: string;
		priceUSD?: number | null;
		title?: string;
	}

	let { variantId, priceUSD = null, title = '' }: Props = $props();

	let busy = $state(false);
	let errorMsg = $state<string | null>(null);

	const priceLabel = $derived(
		typeof priceUSD === 'number'
			? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(priceUSD)
			: null
	);

	async function addToCart() {
		if (busy) return;
		busy = true;
		errorMsg = null;
		try {
			const res = await fetch('/api/cart/add', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ variantId, quantity: 1 })
			});

			if (!res.ok) throw new Error(`HTTP ${res.status}`);

			const data = (await res.json()) as { redirectUrl?: string | null };
			if (data.redirectUrl) {
				window.location.href = data.redirectUrl;
			} else {
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
		{busy ? 'Adding…' : 'Add to cart'}
	</button>
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

	.buy__error {
		margin: 0;
		font-size: calc(var(--fs-xs) * 0.92);
		color: #ff6b6b;
	}
</style>
