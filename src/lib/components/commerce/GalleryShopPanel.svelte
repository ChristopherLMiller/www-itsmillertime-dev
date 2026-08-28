<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { addVariantsToCart } from '$lib/commerce/add-to-cart';
	import { clampQuantity, MAX_CART_QTY, type CartLine } from '$lib/commerce/cart-items';
	import { cartUi } from '$lib/commerce/cart-session.svelte';
	import { shopEnvironment, hydrateShopEnvironment } from '$lib/commerce/ecommerce-environment.svelte';
	import { SHOP_CART_WINDOW } from '$lib/commerce/cart-session';
	import {
		printCropCopy,
		printDpiCopy,
		printFitDetails,
		type PrintFitDetails
	} from '$lib/commerce/print-size';
	import {
		defaultFinishForOffers,
		finishOptionsForOffers,
		formatUsd,
		groupShopOffers,
		listingsForGroup,
		offerForFinish,
		uniqueSizeCount,
		type ShopOffer,
		type ShopOfferGroup
	} from '$lib/commerce/shop-offers';
	import type { GalleryCommerceVariant } from '$lib/utils/gallery-image-display';

	let {
		variants,
		galleryImageId,
		albumSlug,
		imageWidth = null,
		imageHeight = null,
		imageSrc = null,
		pending = false
	}: {
		variants: GalleryCommerceVariant[];
		galleryImageId?: number | null;
		albumSlug?: string | null;
		imageWidth?: number | null;
		imageHeight?: number | null;
		imageSrc?: string | null;
		pending?: boolean;
	} = $props();

	onMount(() => {
		void hydrateShopEnvironment();
	});

	const groups = $derived(groupShopOffers(variants));

	let qtyByVariant = $state<Record<string, number>>({});
	let openGroups = $state<Record<string, boolean>>({});
	let finishByListing = $state<Record<string, string>>({});
	let openFitId = $state<string | null>(null);
	let busy = $state(false);
	let errorMsg = $state<string | null>(null);
	let addedForImageId = $state<number | null | 'none'>('none');
	const justAdded = $derived(
		addedForImageId !== 'none' && addedForImageId === (galleryImageId ?? null)
	);

	const selected = $derived.by((): CartLine[] => {
		const lines: CartLine[] = [];
		for (const group of groups) {
			for (const offer of group.offers) {
				const quantity = clampQuantity(qtyByVariant[offer.variantId] ?? 0);
				if (quantity > 0 && offer.purchasable) {
					lines.push({ variantId: offer.variantId, quantity });
				}
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
				if (quantity <= 0 || !offer.purchasable || typeof offer.priceUSD !== 'number') continue;
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

	function listingKey(groupId: string, title: string): string {
		return `${groupId}::${title}`;
	}

	function finishId(groupId: string, title: string): string {
		return `shop-finish-${groupDomId(listingKey(groupId, title))}`;
	}

	function selectedFinish(groupId: string, title: string, offers: ShopOffer[]): string {
		const options = finishOptionsForOffers(offers);
		if (options.length === 0) return '';
		const stored = finishByListing[listingKey(groupId, title)];
		if (stored !== undefined && options.some((option) => option.value === stored)) {
			return stored;
		}
		return defaultFinishForOffers(offers);
	}

	function setFinish(groupId: string, title: string, value: string) {
		finishByListing[listingKey(groupId, title)] = value;
	}

	function activeOffer(groupId: string, title: string, offers: ShopOffer[]): ShopOffer {
		const options = finishOptionsForOffers(offers);
		if (options.length === 0) return offers[0]!;
		return offerForFinish(offers, selectedFinish(groupId, title, offers));
	}

	function offerQtyContext(group: ShopOfferGroup, offer: ShopOffer): string {
		const finish = offer.finish ? ` ${offer.finish}` : '';
		return `${group.name}${finish} ${offer.title}`;
	}

	function groupQty(group: ShopOfferGroup): number {
		return group.offers.reduce(
			(sum, offer) => sum + clampQuantity(qtyByVariant[offer.variantId] ?? 0),
			0
		);
	}

	function groupOpen(group: ShopOfferGroup): boolean {
		if (group.kind === 'digital') return true;
		return openGroups[group.id] === true;
	}

	function toggleGroup(id: string) {
		openGroups[id] = !openGroups[id];
	}

	function offerFit(kind: ShopOfferGroup['kind'], title: string): PrintFitDetails | null {
		if (kind !== 'print') return null;
		return printFitDetails(title, imageWidth, imageHeight);
	}

	function aspectHint(details: PrintFitDetails | null): string {
		if (!details) return '';
		if (details.lowResolution && details.fit !== 'match') {
			return ', will crop this photo, below recommended print resolution';
		}
		if (details.lowResolution) return ', below recommended print resolution';
		if (details.fit === 'crop') return ', will crop this photo';
		if (details.fit === 'far') return ', different aspect ratio';
		return '';
	}

	function fitPanelId(groupId: string, title: string): string {
		return `shop-fit-${groupDomId(listingKey(groupId, title))}`;
	}

	function toggleFit(groupId: string, title: string) {
		const id = listingKey(groupId, title);
		openFitId = openFitId === id ? null : id;
	}

	function setQty(variantId: string, value: number, purchasable = true) {
		qtyByVariant[variantId] = purchasable ? clampQuantity(value) : 0;
	}

	function bumpQty(variantId: string, delta: number, purchasable = true) {
		if (!purchasable) {
			qtyByVariant[variantId] = 0;
			return;
		}
		setQty(variantId, (qtyByVariant[variantId] ?? 0) + delta);
	}

	async function addSelected(event: SubmitEvent) {
		event.preventDefault();
		if (busy || selected.length === 0) return;
		busy = true;
		errorMsg = null;
		addedForImageId = 'none';
		try {
			const summary = await addVariantsToCart(selected);
			qtyByVariant = {};
			addedForImageId = galleryImageId ?? null;
			if (!summary.cartUrl) {
				errorMsg = 'Added to cart, but the shop URL is not configured.';
			}
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

<div class="shop-shell">
	{#if shopEnvironment.isSandbox && shopEnvironment.warning}
		<aside class="shop-panel__sandbox" role="status">
			<p class="shop-panel__sandbox-kicker">Test mode</p>
			<p class="shop-panel__sandbox-copy">{shopEnvironment.warning}</p>
		</aside>
	{/if}
	{#if pending && groups.length === 0}
	<div class="shop-panel shop-panel--request shop-panel--pending" role="status" aria-busy="true">
		<span class="shop-panel__spinner" aria-hidden="true"></span>
		<span class="shop-panel__sr-only">Loading shop listings</span>
	</div>
{:else if groups.length === 0}
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
				{@const open = groupOpen(group)}
				{@const headingId = `shop-group-${groupDomId(group.id)}`}
				{@const sizesId = `shop-sizes-${groupDomId(group.id)}`}
				{@const listings = listingsForGroup(group)}
				{@const sizeCount = uniqueSizeCount(group.offers)}
				<section
					class="shop-panel__group"
					class:shop-panel__group--digital={group.kind === 'digital'}
					aria-labelledby={headingId}
				>
					{#if group.kind === 'digital'}
						<div class="shop-panel__heading">
							<h3 class="shop-panel__name" id={headingId}>{group.name}</h3>
							<span
								class="shop-panel__badge"
								class:shop-panel__badge--hidden={selectedInGroup === 0}
								aria-hidden={selectedInGroup === 0}
							>
								{selectedInGroup > 0 ? selectedInGroup : ''}
							</span>
						</div>
					{:else}
						<div class="shop-panel__heading">
							<button
								class="shop-panel__toggle"
								type="button"
								id={headingId}
								aria-expanded={open}
								aria-controls={sizesId}
								onclick={() => toggleGroup(group.id)}
							>
								<span class="shop-panel__name">{group.name}</span>
								<span class="shop-panel__heading-meta">
									<span
										class="shop-panel__badge"
										class:shop-panel__badge--hidden={selectedInGroup === 0}
										aria-hidden={selectedInGroup === 0}
									>
										{selectedInGroup > 0 ? selectedInGroup : ''}
									</span>
									{#if !open}
										<span class="shop-panel__size-count">
											{sizeCount}
											{sizeCount === 1 ? 'size' : 'sizes'}
										</span>
									{/if}
									<span
										class="shop-panel__chevron"
										class:shop-panel__chevron--open={open}
										aria-hidden="true"
									></span>
								</span>
							</button>
						</div>
					{/if}
					{#if group.description}
						<p class="shop-panel__desc" title={group.description}>{group.description}</p>
					{/if}
					<div class="shop-panel__sizes" id={sizesId} hidden={!open}>
						<ul class="shop-panel__lines">
							{#each listings as listing (listing.title)}
								{@const finishOptions = finishOptionsForOffers(listing.offers)}
								{@const finishValue = selectedFinish(group.id, listing.title, listing.offers)}
								{@const offer = activeOffer(group.id, listing.title, listing.offers)}
								{@const qty = qtyByVariant[offer.variantId] ?? 0}
								{@const purchasable = offer.purchasable}
								{@const details = offerFit(group.kind, listing.title)}
								{@const fit = details?.fit ?? 'match'}
								{@const showCrop = purchasable && (fit === 'crop' || fit === 'far')}
								{@const showLowRes = purchasable && details?.lowResolution === true}
								{@const listingId = listingKey(group.id, listing.title)}
								{@const fitOpen = openFitId === listingId}
								{@const panelId = fitPanelId(group.id, listing.title)}
								<li
									class="shop-panel__line"
									class:shop-panel__line--crop={fit === 'crop'}
									class:shop-panel__line--far={fit === 'far'}
									class:shop-panel__line--unavailable={!purchasable}
								>
									<div class="shop-panel__size-cell">
										<div class="shop-panel__size-row">
											<label class="shop-panel__size" for={qtyId(offer.variantId)}>
												{listing.title}
											</label>
											{#if finishOptions.length > 0}
												<div class="shop-panel__finish">
													<label
														class="shop-panel__finish-label"
														for={finishId(group.id, listing.title)}
													>
														Finish
													</label>
													<select
														id={finishId(group.id, listing.title)}
														value={finishValue}
														onchange={(e) =>
															setFinish(group.id, listing.title, e.currentTarget.value)}
													>
														{#each finishOptions as option (option.value)}
															<option value={option.value}>{option.label}</option>
														{/each}
													</select>
												</div>
											{/if}
										</div>
										{#if showCrop || showLowRes}
											<div class="shop-panel__chips">
												{#if showCrop}
													<button
														class="shop-panel__chip"
														type="button"
														aria-expanded={fitOpen}
														aria-controls={panelId}
														aria-label="Crop details for {listing.title}"
														onclick={() => toggleFit(group.id, listing.title)}
													>
														Crop
													</button>
												{/if}
												{#if showLowRes}
													<button
														class="shop-panel__chip shop-panel__chip--low"
														type="button"
														aria-expanded={fitOpen}
														aria-controls={panelId}
														aria-label="Resolution details for {listing.title}"
														onclick={() => toggleFit(group.id, listing.title)}
													>
														Low res
													</button>
												{/if}
											</div>
										{/if}
									</div>
									{#if typeof offer.priceUSD === 'number'}
										<span class="shop-panel__price">{formatUsd(offer.priceUSD)}</span>
									{:else if !purchasable}
										<span class="shop-panel__price shop-panel__price--unavailable">Unavailable</span
										>
									{:else}
										<span class="shop-panel__price shop-panel__price--pending">—</span>
									{/if}
									<div class="shop-panel__stepper">
										<button
											class="shop-panel__step"
											type="button"
											disabled={busy || !purchasable || qty <= 0}
											aria-label="Decrease quantity of {offerQtyContext(group, offer)}{aspectHint(
												details
											)}"
											onclick={() => bumpQty(offer.variantId, -1, purchasable)}
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
											disabled={busy || !purchasable}
											value={qty}
											aria-label="Quantity for {offerQtyContext(group, offer)}{aspectHint(details)}"
											oninput={(e) =>
												setQty(offer.variantId, e.currentTarget.valueAsNumber, purchasable)}
										/>
										<button
											class="shop-panel__step"
											type="button"
											disabled={busy || !purchasable || qty >= MAX_CART_QTY}
											aria-label="Increase quantity of {offerQtyContext(group, offer)}{aspectHint(
												details
											)}"
											onclick={() => bumpQty(offer.variantId, 1, purchasable)}
										>
											+
										</button>
									</div>
									{#if (showCrop || showLowRes) && details && imageWidth && imageHeight}
										<div
											class="shop-panel__fit"
											id={panelId}
											hidden={!fitOpen}
											role="region"
											aria-label="Crop and resolution for {listing.title}"
										>
											<div
												class="shop-panel__photo"
												style:--photo-ar="{imageWidth} / {imageHeight}"
												style:--crop-x={details.crop.offsetX}
												style:--crop-y={details.crop.offsetY}
												style:--crop-w={details.crop.visibleWidth}
												style:--crop-h={details.crop.visibleHeight}
												aria-hidden="true"
											>
												{#if imageSrc}
													<img
														class="shop-panel__photo-img"
														src={imageSrc}
														alt=""
														width={imageWidth}
														height={imageHeight}
														decoding="async"
													/>
												{/if}
												<div class="shop-panel__crop-window"></div>
											</div>
											<div class="shop-panel__fit-copy">
												<p>{printCropCopy(details)}</p>
												<p>{printDpiCopy(details)}</p>
											</div>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
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
				{:else if justAdded && selectedCount === 0}
					Added to cart
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
			{#if cartUi.itemCount > 0 && cartUi.cartUrl}
				<a
					class="shop-panel__cart"
					href={cartUi.cartUrl}
					target={SHOP_CART_WINDOW}
					rel="noreferrer"
				>
					View cart · {cartUi.itemCount}
					{cartUi.itemCount === 1 ? 'item' : 'items'}
				</a>
			{/if}
			{#if errorMsg}
				<p class="shop-panel__error" role="alert">{errorMsg}</p>
			{/if}
		</div>
	</form>
	{/if}
</div>

<style>
	.shop-shell {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		min-width: 0;
		min-height: 0;
		height: 100%;
	}

	.shop-panel__sandbox {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		margin: 0;
		padding: 0.9rem 1rem 1rem;
		border-radius: 8px;
		background-color: #e8a54b;
		background-image:
			radial-gradient(ellipse at 20% 0%, rgba(255, 236, 190, 0.35), transparent 55%),
			radial-gradient(ellipse at 90% 110%, rgba(120, 55, 8, 0.22), transparent 50%);
		color: var(--color-primary-darkest);
		flex-shrink: 0;
	}

	.shop-panel__sandbox::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 0;
		background-image:
			url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='grain'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23grain)'/%3E%3C/svg%3E"),
			repeating-radial-gradient(circle at 1px 1px, rgba(60, 22, 0, 0.22) 0 0.55px, transparent 0.7px 2.6px);
		background-size: 140px 140px, 3px 3px;
		opacity: 0.55;
		mix-blend-mode: multiply;
		pointer-events: none;
	}

	.shop-panel__sandbox-kicker {
		position: relative;
		z-index: 1;
		margin: 0 0 0.4rem;
		font-family: var(--font-oswald);
		font-size: 1.15rem;
		font-weight: 500;
		letter-spacing: 0.12em;
		line-height: 1.2;
		text-transform: uppercase;
		text-align: center;
	}

	.shop-panel__sandbox-copy {
		position: relative;
		z-index: 1;
		margin: 0;
		font-size: 1rem;
		line-height: 1.45;
		font-weight: 500;
		text-align: left;
	}

	.shop-panel {
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
		min-width: 0;
		min-height: 0;
		flex: 1 1 auto;
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

	.shop-panel__toggle {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		margin: 0;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		cursor: pointer;
		text-align: left;
	}

	.shop-panel__toggle:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.shop-panel__heading-meta {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.shop-panel__size-count {
		font-family: var(--font-roboto);
		font-size: 0.6875rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-tertiary);
		white-space: nowrap;
	}

	.shop-panel__chevron {
		box-sizing: border-box;
		width: 0.42rem;
		height: 0.42rem;
		margin: 0 0.15rem 0.12rem;
		border-right: 2px solid var(--color-secondary);
		border-bottom: 2px solid var(--color-secondary);
		transform: rotate(45deg);
		transition: transform 0.15s ease;
	}

	.shop-panel__chevron--open {
		margin-bottom: 0;
		margin-top: 0.12rem;
		transform: rotate(-135deg);
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
		color: var(--color-white-darker);
	}

	.shop-panel__sizes[hidden] {
		display: none;
	}

	.shop-panel__finish {
		position: relative;
		display: inline-flex;
		align-items: center;
		flex: 0 0 auto;
		min-width: 0;
		margin: 0;
	}

	.shop-panel__finish-label {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.shop-panel__finish select {
		box-sizing: border-box;
		width: auto;
		max-width: 7.5rem;
		margin: 0;
		padding: 0.12rem 0.4rem;
		border: 1px solid rgba(255, 255, 255, 0.18);
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.28);
		color: var(--color-white-lightest);
		font-family: var(--font-oswald);
		font-size: 0.8125rem;
		font-weight: 500;
		letter-spacing: 0.04em;
		line-height: 1.2;
	}

	.shop-panel__finish select:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
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

	.shop-panel--pending {
		position: relative;
		align-items: center;
		justify-content: center;
		min-height: 5.5rem;
		padding: 1.25rem 0;
	}

	.shop-panel__spinner {
		width: 1.35rem;
		height: 1.35rem;
		border: 2px solid color-mix(in oklch, var(--color-tertiary) 35%, transparent);
		border-top-color: var(--color-secondary);
		border-radius: 50%;
		animation: shop-panel-spin 0.7s linear infinite;
		flex-shrink: 0;
	}

	.shop-panel__sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	@keyframes shop-panel-spin {
		to {
			transform: rotate(360deg);
		}
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

	.shop-panel__line--far .shop-panel__size,
	.shop-panel__line--far .shop-panel__price {
		color: var(--color-tertiary);
	}

	.shop-panel__line--unavailable {
		opacity: 0.55;
	}

	.shop-panel__line--unavailable .shop-panel__size {
		cursor: default;
		color: var(--color-tertiary);
	}

	.shop-panel__size-cell {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.22rem;
		min-width: 0;
	}

	.shop-panel__size-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.5rem;
		min-width: 0;
		width: 100%;
	}

	.shop-panel__size {
		display: block;
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

	.shop-panel__size-row .shop-panel__size {
		flex: 0 1 auto;
		width: auto;
	}

	.shop-panel__chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.22rem;
	}

	.shop-panel__chip {
		display: inline-flex;
		align-items: center;
		margin: 0;
		padding: 0.1em 0.42em 0.08em;
		border: 1px solid var(--color-secondary);
		border-radius: 3px;
		background: transparent;
		font-family: var(--font-oswald);
		font-size: 0.55rem;
		font-weight: 500;
		letter-spacing: 0.1em;
		line-height: 1.2;
		text-transform: uppercase;
		color: var(--color-secondary);
		white-space: nowrap;
		cursor: pointer;
	}

	.shop-panel__chip:hover {
		background: rgba(255, 255, 255, 0.08);
	}

	.shop-panel__chip:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.shop-panel__chip[aria-expanded='true'] {
		background: var(--color-secondary);
		color: var(--color-primary-darkest);
	}

	.shop-panel__chip--low {
		border-color: #e8a54b;
		color: #e8a54b;
	}

	.shop-panel__chip--low[aria-expanded='true'] {
		background: #e8a54b;
		color: var(--color-primary-darkest);
	}

	.shop-panel__fit {
		grid-column: 1 / -1;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 0.7rem;
		align-items: center;
		margin-top: 0.15rem;
		padding: 0.55rem 0.6rem;
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.32);
	}

	.shop-panel__photo {
		position: relative;
		box-sizing: border-box;
		height: 4.6rem;
		aspect-ratio: var(--photo-ar);
		max-width: 7.75rem;
		overflow: hidden;
		border-radius: 3px;
		background: rgba(255, 255, 255, 0.16);
		flex-shrink: 0;
	}

	.shop-panel__photo-img {
		position: absolute;
		inset: 0;
		display: block;
		width: 100%;
		height: 100%;
		object-fit: fill;
		pointer-events: none;
	}

	.shop-panel__crop-window {
		position: absolute;
		top: calc(var(--crop-y) * 100%);
		left: calc(var(--crop-x) * 100%);
		width: calc(var(--crop-w) * 100%);
		height: calc(var(--crop-h) * 100%);
		box-sizing: border-box;
		border: 1.5px solid var(--color-secondary);
		box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.48);
		pointer-events: none;
	}

	.shop-panel__fit-copy {
		min-width: 0;
		font-size: 0.75rem;
		line-height: 1.4;
		color: var(--color-tertiary);
	}

	.shop-panel__fit-copy p {
		margin: 0 0 0.4rem;
	}

	.shop-panel__fit-copy p:last-child {
		margin: 0;
	}

	.shop-panel__fit[hidden] {
		display: none;
	}

	@container (max-width: 20rem) {
		.shop-panel__fit {
			grid-template-columns: 1fr;
		}

		.shop-panel__photo {
			height: 4.1rem;
			max-width: 100%;
		}
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

		.shop-panel__group--digital .shop-panel__sizes {
			min-width: 0;
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

	.shop-panel__price--unavailable {
		color: var(--color-tertiary);
		font-weight: 500;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		font-size: 0.6875rem;
	}

	.shop-panel__price--pending {
		color: var(--color-tertiary);
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

	.shop-panel__cart {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		margin: 0;
		padding: 0.45rem 0.75rem;
		color: var(--color-secondary);
		font-family: var(--font-oswald);
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		text-decoration: none;
	}

	.shop-panel__cart:hover {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	.shop-panel__cart:focus-visible {
		outline: 2px solid var(--color-secondary);
		outline-offset: 2px;
	}

	.shop-panel__error {
		margin: 0;
		font-size: 0.8125rem;
		color: #ff6b6b;
	}

	@media (pointer: coarse) {
		.shop-panel__toggle {
			min-height: 2.75rem;
		}

		.shop-panel__line {
			padding: 0.62rem 0;
			column-gap: 0.5rem;
		}

		.shop-panel__chip {
			min-height: 1.5rem;
			padding: 0.2em 0.5em;
			font-size: 0.6rem;
		}

		.shop-panel__finish select {
			min-height: 2.5rem;
			font-size: 0.875rem;
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

	@media (prefers-reduced-motion: reduce) {
		.shop-panel__spinner {
			animation: none;
			border-top-color: var(--color-secondary);
			opacity: 0.75;
		}
	}
</style>
