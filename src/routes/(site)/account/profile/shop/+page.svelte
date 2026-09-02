<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { jsonErrorMessage } from '$lib/account/authMessage';
	import { formatDateTime, formatMemberSince } from '$lib/account/format';
	import { emptyShopLinkStatus } from '$lib/account/shopLink';
	import AccountField from '$lib/components/account/AccountField.svelte';
	import AccountMessage from '$lib/components/account/AccountMessage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const shop = $derived(data.shopLink ?? emptyShopLinkStatus());
	const shopUrl = $derived(env.PUBLIC_SHOP_URL || env.PUBLIC_STOREFRONT_URL || null);

	let shopEmail = $state('');
	let shopOtp = $state('');
	let shopChallengeId = $state<string | null>(null);
	let shopBusy = $state(false);
	let shopError = $state<string | null>(null);
	let shopNote = $state<string | null>(null);

	async function startShopLink(event: SubmitEvent) {
		event.preventDefault();
		shopBusy = true;
		shopError = null;
		shopNote = null;
		try {
			const res = await fetch('/api/account/shop-link/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: shopEmail.trim() })
			});
			const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			if (!res.ok) throw new Error(jsonErrorMessage(payload, 'Could not start shop linking.'));
			shopChallengeId =
				typeof payload.challenge_id === 'string'
					? payload.challenge_id
					: typeof payload.challengeId === 'string'
						? payload.challengeId
						: null;
			if (!shopChallengeId) throw new Error('Link challenge was not created.');
			shopNote = `We sent a code to ${shopEmail.trim()}.`;
		} catch (err) {
			shopError = err instanceof Error ? err.message : 'Could not start shop linking.';
		} finally {
			shopBusy = false;
		}
	}

	async function confirmShopLink(event: SubmitEvent) {
		event.preventDefault();
		if (!shopChallengeId) return;
		shopBusy = true;
		shopError = null;
		shopNote = null;
		try {
			const res = await fetch('/api/account/shop-link/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ challenge_id: shopChallengeId, code: shopOtp.trim() })
			});
			const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			if (!res.ok) throw new Error(jsonErrorMessage(payload, 'Could not confirm shop linking.'));
			shopChallengeId = null;
			shopOtp = '';
			shopEmail = '';
			shopNote = 'Store account linked.';
			await invalidateAll();
		} catch (err) {
			shopError = err instanceof Error ? err.message : 'Could not confirm shop linking.';
		} finally {
			shopBusy = false;
		}
	}

	async function unlinkShop() {
		shopBusy = true;
		shopError = null;
		shopNote = null;
		try {
			const res = await fetch('/api/account/shop-link', { method: 'DELETE' });
			const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
			if (!res.ok) throw new Error(jsonErrorMessage(payload, 'Could not unlink shop account.'));
			shopNote = 'Store account unlinked.';
			await invalidateAll();
		} catch (err) {
			shopError = err instanceof Error ? err.message : 'Could not unlink shop account.';
		} finally {
			shopBusy = false;
		}
	}
</script>

<svelte:head>
	<title>Shop | Profile | itsMillerTime.dev</title>
</svelte:head>

<section class="account-section">
	<div class="account-section__head">
		<h2>Store account</h2>
		{#if shop.linked}
			<div class="account-actions">
				{#if shopUrl}
					<a
						class="account-btn account-btn--ghost"
						href={shopUrl}
						target="_blank"
						rel="noopener noreferrer">Open store</a
					>
				{/if}
				<button
					type="button"
					class="account-btn account-btn--ghost"
					onclick={unlinkShop}
					disabled={shopBusy}
				>
					{shopBusy ? 'Unlinking…' : 'Unlink'}
				</button>
			</div>
		{/if}
	</div>

	{#if shopError || shop.error}
		<AccountMessage kind="error">{shopError ?? shop.error}</AccountMessage>
	{/if}
	{#if shopNote}
		<AccountMessage kind="success">{shopNote}</AccountMessage>
	{/if}

	{#if shop.linked}
		<p class="account-lede">
			{shop.medusa_customer_email || 'Linked'}
			{#if shop.linked_at}
				· {formatMemberSince(shop.linked_at) ?? formatDateTime(shop.linked_at)}
			{/if}
		</p>
	{:else if shopChallengeId}
		<form class="account-form" onsubmit={confirmShopLink}>
			<div class="account-inline">
				<AccountField label="One-time code">
					<input
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						bind:value={shopOtp}
						disabled={shopBusy}
						required
					/>
				</AccountField>
				<button type="submit" class="account-btn" disabled={shopBusy}>
					{shopBusy ? 'Confirming…' : 'Confirm'}
				</button>
				<button
					type="button"
					class="account-btn account-btn--ghost"
					disabled={shopBusy}
					onclick={() => {
						shopChallengeId = null;
						shopOtp = '';
						shopNote = null;
					}}
				>
					Cancel
				</button>
			</div>
		</form>
	{:else}
		<p class="account-lede">We’ll email a one-time code to the shop inbox.</p>
		<form class="account-form" onsubmit={startShopLink}>
			<div class="account-inline">
				<AccountField label="Shop email">
					<input
						type="email"
						autocomplete="email"
						bind:value={shopEmail}
						disabled={shopBusy}
						required
					/>
				</AccountField>
				<button type="submit" class="account-btn" disabled={shopBusy}>
					{shopBusy ? 'Sending…' : 'Send code'}
				</button>
			</div>
		</form>
	{/if}
</section>

{#if shop.linked}
	<section class="account-section">
		<h2>Orders</h2>
		{#if data.ordersError}
			<AccountMessage kind="error">{data.ordersError}</AccountMessage>
		{/if}
		{#if data.orders.length}
			<table class="account-table">
				<thead>
					<tr>
						<th>Order</th>
						<th>Placed</th>
						<th>Status</th>
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					{#each data.orders as order (order.number + String(order.placedAt))}
						<tr>
							<td>
								{order.number}
								{#if order.itemCount}
									<div class="account-hint">{order.itemCount} items</div>
								{/if}
							</td>
							<td>{order.placedAt ? formatDateTime(order.placedAt) : '—'}</td>
							<td>{order.status ?? '—'}</td>
							<td>{order.totalLabel ?? '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{:else if !data.ordersError}
			<p class="account-hint">No orders yet.</p>
		{/if}
	</section>
{/if}
