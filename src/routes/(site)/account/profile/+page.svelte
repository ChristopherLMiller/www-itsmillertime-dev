<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth/client';
	import Panel from '$lib/components/Panel';
	import { getAvatarUrl, gravatarProfileUrl, hashEmailForGravatar } from '$lib/utils/avatar';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type NsfwFiltering = 'hide' | 'blur' | 'show';
	type AuthSession = {
		id: string;
		createdAt: string | Date;
		expiresAt: string | Date;
		ipAddress?: string | null;
		userAgent?: string | null;
		token?: string;
	};
	type ProfileUserView = {
		id: string | number;
		email?: string | null;
		name?: string | null;
		displayName?: string | null;
		nsfwFiltering?: string | null;
		bggUsername?: string | null;
		image?: string | null;
		role?: string[] | null;
		emailVerified?: boolean | null;
		banned?: boolean | null;
		createdAt?: string;
	};

	let signingOut = $state(false);
	let profileSaving = $state(false);
	let prefsSaving = $state(false);
	let sessionsLoading = $state(false);
	let revokingSessions = $state(false);
	let deletingAccount = $state(false);

	let profileError = $state<string | null>(null);
	let profileSuccess = $state<string | null>(null);
	let prefsError = $state<string | null>(null);
	let prefsSuccess = $state<string | null>(null);
	let sessionsError = $state<string | null>(null);
	let deleteError = $state<string | null>(null);

	let displayName = $state('');
	let name = $state('');
	let nsfwFiltering = $state<NsfwFiltering | ''>('');
	let bggUsername = $state('');

	let deleteConfirm = $state('');

	let otherSessions = $state<AuthSession[]>([]);
	let lastAppliedProfileKey = $state<string | null>(null);
	let sessionsLoadedForUserId = $state<string | number | null>(null);
	let gravatarHash = $state('');
	let hashedEmail = $state('');

	const session = $derived(page.data.session);
	/** Prefer layout session; keep Payload fields from SSR snapshot when client session omits them. */
	const user = $derived.by((): ProfileUserView | undefined => {
		const sessionUser = session?.user as ProfileUserView | undefined;
		const snapshot = data.profileUser as ProfileUserView | undefined;
		if (!sessionUser && !snapshot) return undefined;
		const id = sessionUser?.id ?? snapshot?.id;
		if (id == null) return undefined;
		return {
			...snapshot,
			...sessionUser,
			id,
			displayName: sessionUser?.displayName ?? snapshot?.displayName ?? null,
			nsfwFiltering: sessionUser?.nsfwFiltering ?? snapshot?.nsfwFiltering ?? null,
			bggUsername: sessionUser?.bggUsername ?? snapshot?.bggUsername ?? null,
			name: sessionUser?.name ?? snapshot?.name ?? null,
			image: sessionUser?.image ?? snapshot?.image ?? null,
			email: sessionUser?.email ?? snapshot?.email ?? null,
			role: sessionUser?.role ?? null,
			emailVerified: sessionUser?.emailVerified ?? null,
			banned: sessionUser?.banned ?? null,
			createdAt: sessionUser?.createdAt
		};
	});
	const sess = $derived(session?.session);
	const avatarSrc = $derived(
		getAvatarUrl({
			image: typeof user?.image === 'string' ? user.image : null,
			gravatarHash: gravatarHash || null,
			size: 192
		})
	);
	const usingGravatar = $derived(
		!user?.image && !!avatarSrc && typeof user?.email === 'string'
	);
	const gravatarEditUrl = $derived(
		typeof user?.email === 'string' ? gravatarProfileUrl(user.email) : 'https://gravatar.com'
	);

	function profileKeyFromUser(u: ProfileUserView): string {
		const nsfw = typeof u.nsfwFiltering === 'string' ? u.nsfwFiltering : '';
		return [
			u.id,
			typeof u.displayName === 'string' ? u.displayName : '',
			typeof u.name === 'string' ? u.name : '',
			nsfw,
			typeof u.bggUsername === 'string' ? u.bggUsername : ''
		].join('\u0000');
	}

	function applyUserToForm(u: ProfileUserView) {
		displayName = typeof u.displayName === 'string' ? u.displayName : '';
		name = typeof u.name === 'string' ? u.name : '';
		const nsfw = typeof u.nsfwFiltering === 'string' ? u.nsfwFiltering : '';
		nsfwFiltering = nsfw === 'hide' || nsfw === 'blur' || nsfw === 'show' ? nsfw : '';
		bggUsername = typeof u.bggUsername === 'string' ? u.bggUsername : '';
	}

	$effect(() => {
		const u = user;
		if (!u?.id) return;
		const key = profileKeyFromUser(u);
		if (key === lastAppliedProfileKey) return;
		lastAppliedProfileKey = key;
		applyUserToForm(u);
	});

	$effect(() => {
		const u = user;
		if (!u?.id) return;
		if (sessionsLoadedForUserId === u.id) return;
		sessionsLoadedForUserId = u.id;
		void loadSessions();
	});

	$effect(() => {
		const email = typeof user?.email === 'string' ? user.email : '';
		if (!email || email === hashedEmail) return;
		let cancelled = false;
		void hashEmailForGravatar(email).then((hash) => {
			if (cancelled) return;
			gravatarHash = hash;
			hashedEmail = email;
		});
		return () => {
			cancelled = true;
		};
	});

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatDateTime(value: string | Date) {
		return new Date(value).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function authErrorMessage(err: { message?: string | null } | null | undefined, fallback: string) {
		return err?.message?.trim() || fallback;
	}

	async function patchProfileFields(body: Record<string, unknown>) {
		const res = await fetch('/api/account/profile', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const data = await res.json().catch(() => ({}));
		if (!res.ok) {
			throw new Error(
				typeof data?.error === 'string' ? data.error : 'Failed to update profile fields'
			);
		}
		return data;
	}

	async function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		profileSaving = true;
		profileError = null;
		profileSuccess = null;

		try {
			const nextName = name.trim();
			if (!nextName) {
				profileError = 'Name is required.';
				return;
			}

			const updateResult = await authClient.updateUser({ name: nextName });
			if (updateResult.error) {
				profileError = authErrorMessage(updateResult.error, 'Could not update name.');
				return;
			}

			await patchProfileFields({
				displayName: displayName.trim() || null
			});

			await invalidateAll();
			profileSuccess = 'Profile saved.';
		} catch (err) {
			profileError = err instanceof Error ? err.message : 'Could not save profile.';
		} finally {
			profileSaving = false;
		}
	}

	async function savePreferences(e: SubmitEvent) {
		e.preventDefault();
		prefsSaving = true;
		prefsError = null;
		prefsSuccess = null;

		try {
			await patchProfileFields({
				nsfwFiltering: nsfwFiltering || null,
				bggUsername: bggUsername.trim() || null
			});
			await invalidateAll();
			prefsSuccess = 'Preferences saved.';
		} catch (err) {
			prefsError = err instanceof Error ? err.message : 'Could not save preferences.';
		} finally {
			prefsSaving = false;
		}
	}

	async function loadSessions() {
		sessionsLoading = true;
		sessionsError = null;
		try {
			const result = await authClient.listSessions();
			if (result.error) {
				sessionsError = authErrorMessage(result.error, 'Could not load sessions.');
				otherSessions = [];
				return;
			}

			const currentToken =
				typeof sess?.token === 'string'
					? sess.token
					: typeof sess?.id === 'string'
						? sess.id
						: null;
			const list = (result.data ?? []) as AuthSession[];
			otherSessions = list.filter((s) => {
				if (!currentToken) return true;
				return s.token !== currentToken && s.id !== currentToken;
			});
		} catch (err) {
			sessionsError = err instanceof Error ? err.message : 'Could not load sessions.';
			otherSessions = [];
		} finally {
			sessionsLoading = false;
		}
	}

	async function revokeOtherSessions() {
		revokingSessions = true;
		sessionsError = null;
		try {
			const result = await authClient.revokeOtherSessions();
			if (result.error) {
				sessionsError = authErrorMessage(result.error, 'Could not revoke other sessions.');
				return;
			}
			await loadSessions();
		} catch (err) {
			sessionsError = err instanceof Error ? err.message : 'Could not revoke other sessions.';
		} finally {
			revokingSessions = false;
		}
	}

	async function handleSignOut() {
		signingOut = true;
		try {
			await authClient.signOut({
				fetchOptions: {
					onSuccess: () => {
						goto('/account/login');
					}
				}
			});
		} catch {
			signingOut = false;
		}
	}

	async function deleteAccount(e: SubmitEvent) {
		e.preventDefault();
		deletingAccount = true;
		deleteError = null;

		try {
			if (deleteConfirm !== 'DELETE') {
				deleteError = 'Type DELETE to confirm.';
				return;
			}

			const result = await authClient.deleteUser();

			if (result.error) {
				deleteError = authErrorMessage(
					result.error,
					'Could not delete account. Deletion may be disabled on the server.'
				);
				return;
			}

			window.location.href = '/';
		} catch (err) {
			deleteError = err instanceof Error ? err.message : 'Could not delete account.';
		} finally {
			deletingAccount = false;
		}
	}
</script>

<svelte:head>
	<title>Profile | itsMillerTime.dev</title>
</svelte:head>

<div class="profile-container">
	{#if user && sess}
		<div class="profile-header">
			<Panel hasPadding={true} hasBorder={true}>
				<div class="header-content">
					<div class="avatar-block">
						{#if avatarSrc}
							<img
								src={avatarSrc}
								alt={user.displayName || user.name || 'Avatar'}
								class="avatar"
								width="96"
								height="96"
							/>
						{:else}
							<div class="avatar-placeholder" aria-hidden="true">?</div>
						{/if}
						{#if usingGravatar}
							<a
								href={gravatarEditUrl}
								target="_blank"
								rel="noopener noreferrer"
								class="avatar-link"
							>
								Edit on Gravatar
							</a>
						{/if}
					</div>
					<div class="header-info">
						<h1>{user.displayName || user.name}</h1>
						{#if user.displayName && user.name}
							<p class="name">{user.name}</p>
						{/if}
						<p class="email">{user.email}</p>
						<div class="badges">
							{#each user.role ?? [] as role}
								<span class="badge role">{role}</span>
							{/each}
							{#if !user.emailVerified}
								<span class="badge warning">Email Unverified</span>
							{/if}
							{#if user.banned}
								<span class="badge banned">Banned</span>
							{/if}
						</div>
						{#if user.createdAt}
							<p class="member-since">Member since {formatDate(user.createdAt)}</p>
						{/if}
					</div>
					<div class="header-actions">
						<button
							type="button"
							class="sign-out-btn header-sign-out"
							onclick={handleSignOut}
							disabled={signingOut || deletingAccount}
						>
							{signingOut ? 'Signing out...' : 'Sign Out'}
						</button>
					</div>
				</div>
			</Panel>
		</div>

		<div class="profile-grid">
			<Panel hasPadding={true} hasBorder={true}>
				<section class="section">
					<h2>Profile</h2>
					{#if profileError}
						<div class="message error" role="alert">{profileError}</div>
					{/if}
					{#if profileSuccess}
						<div class="message success" role="status">{profileSuccess}</div>
					{/if}
					<form class="account-form" onsubmit={saveProfile}>
						<label class="field">
							<span>Display name</span>
							<input
								type="text"
								name="displayName"
								autocomplete="nickname"
								bind:value={displayName}
								disabled={profileSaving}
								placeholder="How you're shown on the site"
							/>
						</label>
						<label class="field">
							<span>Name</span>
							<input
								type="text"
								name="name"
								autocomplete="name"
								bind:value={name}
								disabled={profileSaving}
								required
							/>
						</label>
						<button type="submit" class="submit-btn" disabled={profileSaving}>
							{profileSaving ? 'Saving...' : 'Save profile'}
						</button>
					</form>
				</section>
			</Panel>

			<Panel hasPadding={true} hasBorder={true}>
				<section class="section">
					<h2>Preferences</h2>
					{#if prefsError}
						<div class="message error" role="alert">{prefsError}</div>
					{/if}
					{#if prefsSuccess}
						<div class="message success" role="status">{prefsSuccess}</div>
					{/if}
					<form class="account-form" onsubmit={savePreferences}>
						<label class="field">
							<span>NSFW filtering</span>
							<select name="nsfwFiltering" bind:value={nsfwFiltering} disabled={prefsSaving}>
								<option value="">Not set</option>
								<option value="hide">Hide</option>
								<option value="blur">Blur</option>
								<option value="show">Show</option>
							</select>
						</label>
						<label class="field">
							<span>BoardGameGeek username</span>
							<input
								type="text"
								name="bggUsername"
								autocomplete="off"
								bind:value={bggUsername}
								disabled={prefsSaving}
								placeholder="BGG username"
							/>
						</label>
						<button type="submit" class="submit-btn" disabled={prefsSaving}>
							{prefsSaving ? 'Saving...' : 'Save preferences'}
						</button>
					</form>
				</section>
			</Panel>

			<div class="span-all">
			<Panel hasPadding={true} hasBorder={true}>
				<section class="section">
					<h2>Sessions</h2>
					<p class="hint">
						Sign-in is managed by Authentik. Password and email changes happen there.
					</p>
					{#if sessionsError}
						<div class="message error" role="alert">{sessionsError}</div>
					{/if}
					<dl class="details-list">
						<div class="detail-row">
							<dt>This device</dt>
							<dd>
								{formatDateTime(sess.createdAt)}
								{#if sess.ipAddress}
									· {sess.ipAddress}
								{/if}
							</dd>
						</div>
					</dl>
					{#if sessionsLoading}
						<p class="hint">Loading other sessions…</p>
					{:else if otherSessions.length === 0}
						<p class="hint">No other active sessions.</p>
					{:else}
						<ul class="session-list">
							{#each otherSessions as other (other.id)}
								<li>
									<span>{formatDateTime(other.createdAt)}</span>
									{#if other.ipAddress}
										<span class="mono">{other.ipAddress}</span>
									{/if}
									{#if other.userAgent}
										<span class="user-agent">{other.userAgent}</span>
									{/if}
								</li>
							{/each}
						</ul>
						<button
							type="button"
							class="submit-btn secondary"
							onclick={revokeOtherSessions}
							disabled={revokingSessions}
						>
							{revokingSessions ? 'Signing out…' : 'Sign out other sessions'}
						</button>
					{/if}
				</section>
			</Panel>
			</div>

			<div class="span-all">
			<Panel hasPadding={true} hasBorder={true}>
				<section class="section danger">
					<h2>Danger zone</h2>
					<p class="hint">
						Deleting your account is permanent. Type <strong>DELETE</strong> to confirm.
					</p>
					{#if deleteError}
						<div class="message error" role="alert">{deleteError}</div>
					{/if}
					<form class="account-form danger-form" onsubmit={deleteAccount}>
						<label class="field">
							<span>Confirmation</span>
							<input
								type="text"
								name="deleteConfirm"
								autocomplete="off"
								bind:value={deleteConfirm}
								disabled={deletingAccount}
								placeholder="DELETE"
							/>
						</label>
						<button type="submit" class="submit-btn danger-btn" disabled={deletingAccount}>
							{deletingAccount ? 'Deleting…' : 'Delete account'}
						</button>
					</form>
				</section>
			</Panel>
			</div>
		</div>
	{/if}
</div>

<style lang="postcss">
	.profile-container {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		padding-block: 1.5rem;
		max-width: 1100px;
		margin-inline: auto;
		width: 100%;
	}

	.profile-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
		align-items: start;

		@media (min-width: 800px) {
			grid-template-columns: 1fr 1fr;
		}
	}

	.span-all {
		grid-column: 1 / -1;
		min-width: 0;
	}

	.header-content {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 1.25rem 1.5rem;

		@media (max-width: 700px) {
			grid-template-columns: auto 1fr;
		}
	}

	.avatar-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.avatar {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		border: 3px solid var(--color-primary);
		object-fit: cover;
		background: var(--color-white-darker);
	}

	.avatar-placeholder {
		width: 96px;
		height: 96px;
		border-radius: 50%;
		border: 3px solid var(--color-primary);
		background: var(--color-tertiary-darker);
		color: var(--color-white-lightest);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-oswald);
		font-size: var(--fs-s);
		font-weight: 600;
	}

	.avatar-link {
		font-family: var(--font-roboto);
		font-size: 0.7rem;
		color: var(--color-primary-darker);
		text-decoration: underline;
		text-underline-offset: 0.12em;
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
	}

	.header-actions {
		justify-self: end;

		@media (max-width: 700px) {
			grid-column: 1 / -1;
			justify-self: stretch;
		}
	}

	.danger-form {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.75rem;
		align-items: end;

		@media (min-width: 700px) {
			grid-template-columns: 1fr auto;
		}
	}

	h1 {
		font-family: var(--font-permanent-marker);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0;
		line-height: 1.1;
	}

	.name,
	.email,
	.member-since,
	.hint {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0;
	}

	.member-since {
		margin-top: 0.25rem;
	}

	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.25rem;
	}

	.badge {
		font-family: var(--font-source-code-pro);
		font-size: 0.7rem;
		font-weight: 600;
		padding: 0.15rem 0.5rem;
		border-radius: 3px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.badge.role {
		background: var(--color-primary);
		color: var(--color-white-lightest);
	}

	.badge.warning {
		background: var(--color-secondary);
		color: var(--color-tertiary-darkest);
	}

	.badge.banned {
		background: var(--color-primary-darker);
		color: var(--color-white-lightest);
	}

	.section h2 {
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		color: var(--color-primary);
		margin: 0 0 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--color-tertiary-lightest);
	}

	.account-form {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-family: var(--font-special-elite);
		font-size: 0.75rem;
		color: var(--color-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.field input,
	.field select {
		width: 100%;
		padding: 0.75rem 1rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		text-transform: none;
		letter-spacing: normal;
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		transition: border-color 0.2s ease;
		box-sizing: border-box;

		&:focus {
			outline: none;
			border-color: var(--color-primary);
		}

		&:disabled {
			opacity: 0.6;
		}
	}

	.submit-btn {
		align-self: flex-start;
		padding: 0.65rem 1.5rem;
		border: 2px solid var(--color-primary);
		border-radius: 4px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;

		&:hover:not(:disabled) {
			background: var(--color-primary-darker);
			border-color: var(--color-primary-darker);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.submit-btn.secondary {
		background: transparent;
		color: var(--color-primary-darker);

		&:hover:not(:disabled) {
			background: var(--color-white-darker);
			border-color: var(--color-primary);
			color: var(--color-primary-darker);
		}
	}

	.submit-btn.danger-btn {
		background: var(--color-primary-darker);
		border-color: var(--color-primary-darker);

		&:hover:not(:disabled) {
			background: var(--color-primary);
			border-color: var(--color-primary);
		}
	}

	.message {
		padding: 0.75rem 1rem;
		border-radius: 4px;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		margin-bottom: 0.75rem;
	}

	.message.error {
		background-color: oklch(0.9 0.05 25);
		border: 1px solid var(--color-primary);
		color: var(--color-primary-darker);
	}

	.message.success {
		background-color: oklch(0.93 0.04 145);
		border: 1px solid oklch(0.55 0.15 145);
		color: oklch(0.35 0.1 145);
	}

	.details-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0 0 0.75rem;
	}

	.detail-row {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	dt {
		font-family: var(--font-special-elite);
		font-size: 0.75rem;
		color: var(--color-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	dd {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darkest);
		margin: 0;
	}

	.session-list {
		list-style: none;
		margin: 0 0 0.75rem;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
	}

	.session-list li {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--color-tertiary-lightest);
		border-radius: 4px;
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darkest);
	}

	.mono {
		font-family: var(--font-source-code-pro);
	}

	.user-agent {
		font-size: 0.7rem;
		word-break: break-all;
		line-height: 1.4;
		color: var(--color-tertiary);
	}

	.sign-out-btn {
		padding: 0.65rem 1.5rem;
		border: 2px solid var(--color-tertiary-lighter);
		border-radius: 4px;
		background: transparent;
		color: var(--color-tertiary-darkest);
		font-family: var(--font-roboto);
		font-size: var(--fs-base);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;

		&:hover:not(:disabled) {
			border-color: var(--color-primary);
			color: var(--color-primary-darker);
		}

		&:disabled {
			opacity: 0.6;
			cursor: not-allowed;
		}
	}

	.header-sign-out {
		width: 100%;
	}
</style>
