<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { accessRoleChips, formatMemberSince } from '$lib/account/format';
	import { displayLabel, mergeProfileUser, type NsfwFiltering } from '$lib/account/profileUser';
	import { saveProfileFields } from '$lib/account/saveProfile';
	import AccountAvatar from '$lib/components/account/AccountAvatar.svelte';
	import AccountField from '$lib/components/account/AccountField.svelte';
	import AccountMessage from '$lib/components/account/AccountMessage.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const user = $derived(mergeProfileUser(page.data.session?.user, data.profileUser));
	const chips = $derived(user ? accessRoleChips(user.role) : []);
	const memberSince = $derived(user ? formatMemberSince(user.createdAt) : null);
	const nsfwChoices: { value: NsfwFiltering; title: string; hint: string }[] = [
		{ value: 'hide', title: 'Hide', hint: 'Skip NSFW albums and photos' },
		{ value: 'blur', title: 'Blur', hint: 'Cover until you choose to reveal' },
		{ value: 'show', title: 'Show', hint: 'Show NSFW content as-is' }
	];

	let displayName = $state('');
	let username = $state('');
	let bggUsername = $state('');
	let nsfwFiltering = $state<NsfwFiltering | ''>('');
	let appliedKey = $state('');
	let saving = $state(false);
	let errorMessage = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	$effect(() => {
		const u = user;
		if (!u) return;
		const key = [u.id, u.displayName, u.name, u.bggUsername, u.nsfwFiltering].join('\u0000');
		if (key === appliedKey) return;
		appliedKey = key;
		displayName = u.displayName ?? '';
		username = u.name ?? '';
		bggUsername = u.bggUsername ?? '';
		nsfwFiltering = u.nsfwFiltering ?? '';
	});

	async function saveProfile(event: SubmitEvent) {
		event.preventDefault();
		if (!username.trim()) {
			errorMessage = 'Username is required.';
			return;
		}
		saving = true;
		errorMessage = null;
		successMessage = null;
		try {
			await saveProfileFields({
				name: username.trim(),
				displayName: displayName.trim() || null,
				bggUsername: bggUsername.trim() || null,
				nsfwFiltering: nsfwFiltering || null
			});
			await invalidateAll();
			successMessage = 'Profile saved.';
		} catch (err) {
			errorMessage = err instanceof Error ? err.message : 'Could not save profile.';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Profile | itsMillerTime.dev</title>
</svelte:head>

{#if user}
	<section class="account-section">
		<div class="account-identity">
			<AccountAvatar image={user.image} email={user.email} label={displayLabel(user)} stretch />
			<div class="account-identity__text">
				{#if user.email}
					<p>{user.email}</p>
				{/if}
				{#if memberSince || user.banned}
					<p>
						{#if memberSince}
							Member since {memberSince}
						{/if}
						{#if user.banned}
							{memberSince ? ' · ' : ''}This account is banned
						{/if}
					</p>
				{/if}
				{#if chips.length}
					<ul class="account-meta">
						{#each chips as chip (chip.id)}
							<li class="account-chip">{chip.label}</li>
						{/each}
					</ul>
				{/if}
				{#if user.email && user.emailVerified !== true}
					<p>
						<a href="/account/profile/security">Email isn’t verified</a>
					</p>
				{/if}
			</div>
		</div>
		{#if errorMessage}
			<AccountMessage kind="error">{errorMessage}</AccountMessage>
		{/if}
		{#if successMessage}
			<AccountMessage kind="success">{successMessage}</AccountMessage>
		{/if}
		<form class="account-form" onsubmit={saveProfile}>
			<div class="account-row">
				<AccountField label="Username">
					<input
						type="text"
						name="username"
						autocomplete="username"
						bind:value={username}
						disabled={saving}
						required
					/>
				</AccountField>
				<AccountField label="Display name">
					<input
						type="text"
						name="displayName"
						autocomplete="nickname"
						bind:value={displayName}
						disabled={saving}
					/>
				</AccountField>
			</div>
			<div class="account-row">
				<AccountField label="BoardGameGeek">
					<input
						type="text"
						name="bggUsername"
						autocomplete="off"
						bind:value={bggUsername}
						disabled={saving}
					/>
				</AccountField>
				<div class="account-field">
					<span>NSFW photos</span>
					<div class="account-segment" role="group" aria-label="NSFW photos">
						{#each nsfwChoices as choice (choice.value)}
							<button
								type="button"
								title={choice.hint}
								aria-pressed={nsfwFiltering === choice.value}
								disabled={saving}
								onclick={() => (nsfwFiltering = choice.value)}
							>
								{choice.title}
							</button>
						{/each}
					</div>
				</div>
			</div>

			<div class="account-actions">
				<button type="submit" class="account-btn" disabled={saving}>
					{saving ? 'Saving…' : 'Save'}
				</button>
			</div>
		</form>
	</section>
{/if}
