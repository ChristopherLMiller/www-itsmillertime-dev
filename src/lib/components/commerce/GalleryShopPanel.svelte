<script lang="ts">
	import { addVariantsToCart } from '$lib/commerce/add-to-cart';
	import { clampQuantity, MAX_CART_QTY, type CartLine } from '$lib/commerce/cart-items';
	import { formatUsd, groupShopOffers, type ShopOfferGroup } from '$lib/commerce/shop-offers';
	import type { GalleryCommerceVariant } from '$lib/utils/gallery-image-display';

	let { variants }: { variants: GalleryCommerceVariant[] } = $props();

	const groups = $derived(groupShopOffers(variants));

	let qtyByVariant = $state<Record<string, number>>({});
	let busy = $state(false);
	let errorMsg = $state<string | null>(null);

	const selected = $derived.by((): CartLine[] => {
		const lines: CartLine[] = [];
		for (const group of groups) {
			for (const offer of group.offers) {
				const quantity = clampQuantity(qtyByVariant[offer.variantId] ?? 0);
				if (quantity > 0) lines.push({ variantId: offer.variantId, quantity });
			}
		}
		return lines;
	});

	const selectedCount = $derived(selected.reduce((sum, line) => sum + line.quantity, 0));

	const selectedTotal = $derived.by((): number | null => {
		let total = 0;
		let any = false;
		for (const group of groups) {
			for (const offer of group.offers) {
				const quantity = clampQuantity(qtyByVariant[offer.variantId] ?? 0);
				if (quantity <= 0 || typeof offer.priceUSD !== 'number') continue;
				total += offer.priceUSD * quantity;
				any = true;
			}
		}
		return any ? total : null;
	});

	function groupDomId(id: string): string {
		return id.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
	}

	function qtyId(variantId: string): string {
		return `shop-qty-${variantId.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;
	}

	function groupQty(group: ShopOfferGroup): number {
		return group.offers.reduce(
			(sum, offer) => sum + clampQuantity(qtyByVariant[offer.variantId] ?? 0),
			0
		);
	}

	function setQty(variantId: string, value: number) {
		qtyByVariant[variantId] = clampQuantity(value);
	}

	function bumpQty(variantId: string, delta: number) {
		setQty(variantId, (qtyByVariant[variantId] ?? 0) + delta);
	}

	async function addSelected(event: SubmitEvent) {
		event.preventDefault();
		if (busy || selected.length === 0) return;
		busy = true;
		errorMsg = null;
		try {
			const { redirectUrl } = await addVariantsToCart(selected);
			if (redirectUrl) {
				window.location.href = redirectUrl;
				return;
			}
			errorMsg = 'Added to cart, but the shop URL is not configured.';
		} catch {
			errorMsg = 'Could not add to cart. Please try again.';
		} finally {
			busy = false;
		}
	}
</script>

{#if groups.length === 0}
	<p class="shop-panel__empty">
		This image isn't available for purchase right now. Check back later for ways to bring it home.
	</p>
{:else}
	<form class="shop-panel" onsubmit={addSelected}>
		{#snippet groupPanel(group: ShopOfferGroup, selectedInGroup: number)}
			<summary class="shop-panel__summary" id="shop-group-{groupDomId(group.id)}">
				<span class="shop-panel__name">{group.name}</span>
				<span class="shop-panel__summary-meta">
					{#if selectedInGroup > 0}
						<span class="shop-panel__badge">{selectedInGroup}</span>
					{/if}
					<span class="shop-panel__chevron" aria-hidden="true"></span>
				</span>
			</summary>
			{#if group.description}
				<p class="shop-panel__desc">{group.description}</p>
			{/if}
			<ul class="shop-panel__lines">
				{#each group.offers as offer (offer.variantId)}
					{@const qty = qtyByVariant[offer.variantId] ?? 0}
					<li class="shop-panel__line">
						<label class="shop-panel__line-copy" for={qtyId(offer.variantId)}>
							<span class="shop-panel__size">{offer.title}</span>
							{#if typeof offer.priceUSD === 'number'}
								<span class="shop-panel__price">{formatUsd(offer.priceUSD)}</span>
							{/if}
						</label>
						<div class="shop-panel__stepper">
							<button
								class="shop-panel__step"
								type="button"
								disabled={busy || qty <= 0}
								aria-label="Decrease quantity of {group.name} {offer.title}"
								onclick={() => bumpQty(offer.variantId, -1)}
							>
								−
							</button>
							<input
								class="shop-panel__qty"
								id={qtyId(offer.variantId)}
								type="number"
								inputmode="numeric"
								min="0"
								max={MAX_CART_QTY}
								step="1"
								disabled={busy}
								value={qty}
								aria-label="Quantity for {group.name} {offer.title}"
								oninput={(e) => setQty(offer.variantId, e.currentTarget.valueAsNumber)}
							/>
							<button
								class="shop-panel__step"
								type="button"
								disabled={busy || qty >= MAX_CART_QTY}
								aria-label="Increase quantity of {group.name} {offer.title}"
								onclick={() => bumpQty(offer.variantId, 1)}
							>
								+
							</button>
						</div>
					</li>
				{/each}
			</ul>
		{/snippet}

		{#each groups as group, i (group.id)}
			{@const selectedInGroup = groupQty(group)}
			{#if i === 0}
				<details class="shop-panel__group" open>
					{@render groupPanel(group, selectedInGroup)}
				</details>
			{:else}
				<details class="shop-panel__group">
					{@render groupPanel(group, selectedInGroup)}
				</details>
			{/if}
		{/each}

		<div class="shop-panel__footer">
			<button class="shop-panel__add" type="submit" disabled={busy || selectedCount === 0}>
				{#if busy}
					Adding…
				{:else if selectedCount === 0}
					Add to cart
				{:else if selectedTotal != null}
					Add {selectedCount}
					{selectedCount === 1 ? 'item' : 'items'} · {formatUsd(selectedTotal)}
				{:else}
					Add {selectedCount}
					{selectedCount === 1 ? 'item' : 'items'}
				{/if}
			</button>
			{#if errorMsg}
				<p class="shop-panel__error" role="alert">{errorMsg}</p>
			{/if}
		</div>
	</form>
{/if}

<style>
	.shop-panel {
		display: flex;
		flex-direction: column;
		gap: 1.15rem;
	}

	.shop-panel__group {
		margin: 0;
	}

	.shop-panel__summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 0;
		padding: 0.35rem 0 0.4rem;
		border-bottom: 1px solid var(--color-tertiary-lighter);
		color: var(--color-white-lightest);
		cursor: pointer;
		list-style: none;
	}

	.shop-panel__summary::-webkit-details-marker,
	.shop-panel__summary::marker {
		display: none;
		content: '';
	}

	.shop-panel__summary:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.shop-panel__name {
		font-size: 0.95rem;
		font-weight: 700;
		letter-spacing: 0.01em;
	}

	.shop-panel__desc {
		margin: 0.55rem 0 0.15rem;
		font-size: calc(var(--fs-xs) * 0.95);
		line-height: 1.45;
		color: var(--color-tertiary);
		white-space: pre-wrap;
	}

	.shop-panel__summary-meta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.shop-panel__badge {
		min-width: 1.25rem;
		padding: 0.1rem 0.4rem;
		border-radius: 999px;
		background: var(--color-secondary);
		color: var(--color-primary-darkest);
		font-size: calc(var(--fs-xs) * 0.85);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-align: center;
		line-height: 1.3;
	}

	.shop-panel__chevron {
		width: 0.42rem;
		height: 0.42rem;
		border-right: 2px solid var(--color-tertiary);
		border-bottom: 2px solid var(--color-tertiary);
		transform: rotate(45deg);
		transition: transform 150ms ease;
	}

	.shop-panel__group[open] .shop-panel__chevron {
		transform: rotate(225deg);
	}

	.shop-panel__empty {
		margin: 0;
		font-size: calc(var(--fs-xs) * 0.95);
		line-height: 1.45;
		color: var(--color-tertiary);
	}

	.shop-panel__lines {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.shop-panel__line {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.75rem;
		padding: 0.45rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.shop-panel__line:last-child {
		border-bottom: none;
	}

	.shop-panel__line-copy {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		min-width: 0;
		cursor: pointer;
	}

	.shop-panel__size {
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.2;
		color: var(--color-white-lightest);
	}

	.shop-panel__price {
		flex-shrink: 0;
		font-size: calc(var(--fs-xs) * 0.98);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-secondary);
	}

	.shop-panel__stepper {
		display: inline-flex;
		align-items: stretch;
		flex-shrink: 0;
		border: 1px solid rgba(255, 255, 255, 0.22);
		border-radius: 6px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.25);
	}

	.shop-panel__step {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		width: 1.85rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--color-white-lightest);
		font-family: inherit;
		font-size: 1.05rem;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
	}

	.shop-panel__step:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.1);
	}

	.shop-panel__step:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: -2px;
	}

	.shop-panel__step:disabled {
		opacity: 0.35;
		cursor: default;
	}

	.shop-panel__qty {
		box-sizing: border-box;
		width: 2.4rem;
		margin: 0;
		padding: 0.35rem 0.15rem;
		border: 0;
		border-left: 1px solid rgba(255, 255, 255, 0.16);
		border-right: 1px solid rgba(255, 255, 255, 0.16);
		border-radius: 0;
		background: transparent;
		color: var(--color-white-lightest);
		font-family: inherit;
		font-size: 0.95rem;
		font-variant-numeric: tabular-nums;
		text-align: center;
		appearance: textfield;
	}

	.shop-panel__qty::-webkit-outer-spin-button,
	.shop-panel__qty::-webkit-inner-spin-button {
		appearance: none;
		margin: 0;
	}

	.shop-panel__qty:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.shop-panel__qty:disabled {
		opacity: 0.55;
	}

	.shop-panel__footer {
		position: sticky;
		bottom: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0 -0.15rem;
		padding: 0.75rem 0.15rem 0.15rem;
		background: linear-gradient(
			180deg,
			transparent 0%,
			var(--color-tertiary-darker) 0.55rem,
			var(--color-tertiary-darker) 100%
		);
		z-index: 1;
	}

	.shop-panel__add {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		margin: 0;
		padding: 0.7rem 1rem;
		border: 1px solid var(--color-secondary);
		border-radius: 8px;
		background: var(--color-secondary);
		color: var(--color-primary-darkest);
		font-family: inherit;
		font-size: 0.95rem;
		font-weight: 700;
		cursor: pointer;
	}

	.shop-panel__add:hover:not(:disabled) {
		filter: brightness(1.08);
	}

	.shop-panel__add:focus-visible {
		outline: 2px solid var(--color-white-lightest);
		outline-offset: 2px;
	}

	.shop-panel__add:disabled {
		opacity: 0.45;
		cursor: default;
	}

	.shop-panel__error {
		margin: 0;
		font-size: calc(var(--fs-xs) * 0.92);
		color: #ff6b6b;
	}
</style>
