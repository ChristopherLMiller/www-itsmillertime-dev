<script lang="ts">
	import SecretField from '$lib/components/admin/SecretField.svelte';
	import { cloneSiteSettings, patchSiteSettings } from '$lib/settings/client';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let draft = $state(data.settings ? cloneSiteSettings(data.settings) : null);
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	async function save(event: SubmitEvent) {
		event.preventDefault();
		if (!draft) return;
		saving = true;
		errorMessage = null;
		successMessage = null;
		try {
			const saved = await patchSiteSettings({ email: draft.email });
			draft = cloneSiteSettings(saved);
			successMessage = 'Email settings saved.';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Failed to save email settings.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Email settings | itsMillerTime.dev</title>
</svelte:head>

<div class="admin-page">
	{#if data.loadError || !draft}
		<div class="admin-page__head">
			<h1>Email</h1>
		</div>
		<p class="message error" role="alert">{data.loadError ?? 'Settings are unavailable.'}</p>
	{:else}
		<form class="admin-form" onsubmit={save}>
			<div class="admin-page__head">
				<h1>Email</h1>
				<div class="admin-actions">
					<button type="submit" class="submit-btn" disabled={saving}>
						{saving ? 'Saving…' : 'Save'}
					</button>
				</div>
			</div>
			{#if errorMessage}
				<div class="message error" role="alert">{errorMessage}</div>
			{/if}
			{#if successMessage}
				<div class="message success" role="status">{successMessage}</div>
			{/if}
			<section class="admin-block">
				<h2>Connection</h2>
				<div class="admin-form--fields">
					<SecretField
						id="resend-api-key"
						label="API key"
						bind:value={draft.email.resendApiKey}
						disabled={saving}
					/>
					<label class="field" for="from-address">
						<span>From address</span>
						<input
							id="from-address"
							type="email"
							autocomplete="off"
							bind:value={draft.email.fromAddress}
							disabled={saving}
						/>
					</label>
					<label class="field" for="from-name">
						<span>From name</span>
						<input
							id="from-name"
							type="text"
							autocomplete="off"
							bind:value={draft.email.fromName}
							disabled={saving}
						/>
					</label>
				</div>
			</section>
		</form>
	{/if}
</div>
