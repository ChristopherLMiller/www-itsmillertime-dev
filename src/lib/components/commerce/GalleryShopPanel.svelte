<script lang="ts">
	import { page } from '$app/state';
	import { addVariantsToCart } from '$lib/commerce/add-to-cart';
	import { clampQuantity, MAX_CART_QTY, type CartLine } from '$lib/commerce/cart-items';
	import { formatUsd, groupShopOffers, type ShopOfferGroup } from '$lib/commerce/shop-offers';
	import type { GalleryCommerceVariant } from '$lib/utils/gallery-image-display';

	let {
		variants,
		galleryImageId,
		albumSlug
	}: {
		variants: GalleryCommerceVariant[];
		galleryImageId?: number | null;
		albumSlug?: string | null;
	} = $props();

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
		return id
			.replace(/[^a-z0-9]+/gi, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase();
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

	function sessionString(value: unknown): string {
		return typeof value === 'string' ? value.trim() : '';
	}

	function prefillFromSession(): { name: string; email: string } {
		const user = page.data.session?.user as Record<string, unknown> | undefined;
		if (!user) return { name: '', email: '' };
		return {
			name: sessionString(user.displayName) || sessionString(user.name),
			email: sessionString(user.email)
		};
	}

	const prefill = prefillFromSession();
	let requestName = $state(prefill.name);
	let requestEmail = $state(prefill.email);
	let requestBusy = $state(false);
	let requestError = $state<string | null>(null);
	let requestOutcome = $state<'idle' | 'success' | 'duplicate'>('idle');

	async function submitRequest(event: SubmitEvent) {
		event.preventDefault();
		if (requestBusy || galleryImageId == null) return;
		requestBusy = true;
		requestError = null;
		try {
			const res = await fetch('/api/gallery/product-request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: requestName,
					email: requestEmail,
					galleryImageId,
					albumSlug: albumSlug ?? undefined
				})
			});
			const data = (await res.json().catch(() => ({}))) as {
				error?: string;
				duplicate?: boolean;
			};
			if (!res.ok) {
				requestError = data.error ?? 'Could not send your request. Please try again.';
				return;
			}
			requestOutcome = data.duplicate ? 'duplicate' : 'success';
		} catch {
			requestError = 'Could not send your request. Please try again.';
		} finally {
			requestBusy = false;
		}
	}
</script>

{#if groups.length === 0}
	<div class="shop-panel shop-panel--request">
		{#if requestOutcome === 'success'}
			<p class="shop-panel__success" role="status">
				Thanks — I'll email you if this image becomes available to buy.
			</p>
		{:else if requestOutcome === 'duplicate'}
			<p class="shop-panel__success" role="status">
				You're already on the list for this image. I'll email you if it becomes available.
			</p>
		{:else if galleryImageId == null}
			<p class="shop-panel__empty">
				This image isn't available for purchase right now. Check back later for ways to bring it
				home.
			</p>
		{:else}
			<p class="shop-panel__empty">
				This image isn't listed in the shop yet. Leave your name and email and I'll let you know if
				I make it available to buy.
			</p>
			<form
				class="shop-panel__request"
				aria-label="Request this image in the shop"
				onsubmit={submitRequest}
			>
				<div class="shop-panel__field">
					<label for="shop-request-name">Name</label>
					<input
						id="shop-request-name"
						name="name"
						type="text"
						autocomplete="name"
						required
						maxlength="200"
						disabled={requestBusy}
						bind:value={requestName}
					/>
				</div>
				<div class="shop-panel__field">
					<label for="shop-request-email">Email</label>
					<input
						id="shop-request-email"
						name="email"
						type="email"
						autocomplete="email"
						required
						maxlength="320"
						disabled={requestBusy}
						bind:value={requestEmail}
					/>
				</div>
				{#if requestError}
					<p class="shop-panel__error" role="alert">{requestError}</p>
				{/if}
				<button class="shop-panel__add" type="submit" disabled={requestBusy}>
					{requestBusy ? 'Sending…' : 'Request it'}
				</button>
			</form>
		{/if}
	</div>
{:else}
	<form class="shop-panel" onsubmit={addSelected}>
		<div class="shop-panel__catalog">
			{#snippet offerGroup(group: ShopOfferGroup)}
				{@const selectedInGroup = groupQty(group)}
				<section
					class="shop-panel__group"
					class:shop-panel__group--digital={group.kind === 'digital'}
					aria-labelledby="shop-group-{groupDomId(group.id)}"
				>
					<div class="shop-panel__heading">
						<h3 class="shop-panel__name" id="shop-group-{groupDomId(group.id)}">{group.name}</h3>
						<span
							class="shop-panel__badge"
							class:shop-panel__badge--hidden={selectedInGroup === 0}
							aria-hidden={selectedInGroup === 0}
						>
							{selectedInGroup > 0 ? selectedInGroup : ''}
						</span>
					</div>
					{#if group.description}
						<p class="shop-panel__desc" title={group.description}>{group.description}</p>
					{/if}
					<ul class="shop-panel__lines">
						{#each group.offers as offer (offer.variantId)}
							{@const qty = qtyByVariant[offer.variantId] ?? 0}
							<li class="shop-panel__line">
								<label class="shop-panel__size" for={qtyId(offer.variantId)}>{offer.title}</label>
								{#if typeof offer.priceUSD === 'number'}
									<span class="shop-panel__price">{formatUsd(offer.priceUSD)}</span>
								{:else}
									<span class="shop-panel__price" aria-hidden="true"></span>
								{/if}
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
				</section>
			{/snippet}

			{#each groups as group (group.id)}
				{@render offerGroup(group)}
			{/each}
		</div>

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
		gap: 0.85rem;
		min-width: 0;
		min-height: 0;
		height: 100%;
		font-family: var(--font-roboto);
		container-type: inline-size;
	}

	.shop-panel__catalog {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		min-width: 0;
		min-height: 0;
		flex: 1 1 auto;
		overflow-x: hidden;
		overflow-y: auto;
	}

	.shop-panel__group {
		display: flex;
		flex-direction: column;
		min-width: 0;
		margin: 0;
		padding: 0.7rem 0.95rem 0.65rem;
		border: 1px solid var(--color-tertiary-lighter);
		border-radius: 10px;
		background: rgba(0, 0, 0, 0.32);
	}

	.shop-panel__heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		margin: 0;
		padding: 0 0 0.4rem;
		border-bottom: 1px solid var(--color-tertiary-lighter);
		min-height: 1.15rem;
	}

	.shop-panel__name {
		margin: 0;
		font-family: var(--font-oswald);
		font-size: 0.78rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		line-height: 1.3;
		text-transform: uppercase;
		color: var(--color-secondary);
	}

	.shop-panel__desc {
		margin: 0.5rem 0 0.2rem;
		font-size: 0.8125rem;
		line-height: 1.45;
		color: var(--color-tertiary);
	}

	.shop-panel__badge {
		box-sizing: border-box;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.15rem;
		height: 1.15rem;
		padding: 0 0.35rem;
		border-radius: 999px;
		background: var(--color-secondary);
		color: var(--color-primary-darkest);
		font-size: 0.6875rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		text-align: center;
		flex-shrink: 0;
	}

	.shop-panel__badge--hidden {
		visibility: hidden;
	}

	.shop-panel__empty {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-tertiary);
	}

	.shop-panel--request {
		gap: 0.9rem;
		height: auto;
	}

	.shop-panel__request {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.shop-panel__field {
		display: flex;
		flex-direction: column;
		gap: 0.28rem;
	}

	.shop-panel__field label {
		font-family: var(--font-oswald);
		font-size: 0.7rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--color-tertiary);
	}

	.shop-panel__field input {
		box-sizing: border-box;
		width: 100%;
		margin: 0;
		padding: 0.55rem 0.7rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.28);
		color: var(--color-white-lightest);
		font-family: inherit;
		font-size: 0.9375rem;
	}

	.shop-panel__field input:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.shop-panel__field input:disabled {
		opacity: 0.55;
	}

	.shop-panel__success {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--color-secondary);
	}

	.shop-panel__lines {
		list-style: none;
		margin: 0;
		padding: 0.1rem 0 0;
		display: grid;
		grid-template-columns: 1fr;
		column-gap: 1rem;
		row-gap: 0;
		min-height: 0;
	}

	.shop-panel__line {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 4.25rem auto;
		align-items: center;
		column-gap: 0.55rem;
		min-width: 0;
		width: 100%;
		padding: 0.42rem 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	.shop-panel__line:last-child {
		border-bottom: none;
		padding-bottom: 0.15rem;
	}

	@container (min-width: 28rem) {
		.shop-panel__lines:not(:has(> :only-child)) {
			grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
			column-gap: 1.25rem;
		}

		.shop-panel__group--digital {
			display: grid;
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 0.35rem 1.25rem;
			align-items: center;
		}

		.shop-panel__group--digital .shop-panel__heading {
			grid-column: 1 / -1;
		}

		.shop-panel__group--digital .shop-panel__desc {
			margin: 0.35rem 0 0;
		}

		.shop-panel__group--digital .shop-panel__lines {
			padding: 0.35rem 0 0;
			display: flex;
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: 0.35rem 1rem;
		}

		.shop-panel__group--digital .shop-panel__line {
			width: auto;
			padding: 0;
			border-bottom: none;
			grid-template-columns: max-content max-content auto;
			column-gap: 0.75rem;
		}
	}

	.shop-panel__size {
		min-width: 0;
		margin: 0;
		font-family: var(--font-oswald);
		font-size: 1rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		line-height: 1.2;
		overflow-wrap: anywhere;
		color: var(--color-white-lightest);
		cursor: pointer;
	}

	.shop-panel__price {
		justify-self: end;
		font-size: 0.875rem;
		font-weight: 500;
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.01em;
		text-align: right;
		color: var(--color-secondary);
		white-space: nowrap;
	}

	.shop-panel__stepper {
		display: inline-flex;
		align-items: stretch;
		justify-self: end;
		flex-shrink: 0;
		height: 2rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 999px;
		overflow: hidden;
		background: rgba(0, 0, 0, 0.28);
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
		font-size: 1rem;
		font-weight: 500;
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
		width: 2.1rem;
		margin: 0;
		padding: 0;
		border: 0;
		border-left: 1px solid rgba(255, 255, 255, 0.12);
		border-right: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 0;
		background: transparent;
		color: var(--color-white-lightest);
		font-family: inherit;
		font-size: 0.875rem;
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
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding-top: 0.15rem;
	}

	.shop-panel__add {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		margin: 0;
		padding: 0.75rem 1rem;
		border: 1px solid var(--color-secondary);
		border-radius: 8px;
		background: var(--color-secondary);
		color: var(--color-primary-darkest);
		font-family: var(--font-oswald);
		font-size: 0.85rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
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
		font-size: 0.8125rem;
		color: #ff6b6b;
	}

	@media (pointer: coarse) {
		.shop-panel__line {
			padding: 0.62rem 0;
			column-gap: 0.5rem;
		}

		.shop-panel__size {
			font-size: 1.05rem;
		}

		.shop-panel__stepper {
			height: 2.75rem;
		}

		.shop-panel__step {
			width: 2.5rem;
			font-size: 1.15rem;
		}

		.shop-panel__qty {
			width: 2.5rem;
			font-size: 1rem;
		}

		.shop-panel__add {
			min-height: 2.75rem;
			padding: 0.85rem 1rem;
		}
	}

	@media (max-width: 768px) {
		.shop-panel__lines {
			grid-template-columns: 1fr;
		}

		.shop-panel__line {
			grid-template-columns: minmax(0, 1fr) max-content auto;
			column-gap: 0.55rem;
		}
	}
</style>
