<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { authErrorMessage } from '$lib/account/authMessage';
	import { formatDateTime } from '$lib/account/format';
	import { mergeProfileUser } from '$lib/account/profileUser';
	import {
		parseAuthSession,
		sessionIdentity,
		type AuthSessionView
	} from '$lib/account/sessionView';
	import { authClient } from '$lib/auth/client';
	import AccountField from '$lib/components/account/AccountField.svelte';
	import AccountMessage from '$lib/components/account/AccountMessage.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const user = $derived(mergeProfileUser(page.data.session?.user, data.profileUser));
	const currentSess = $derived(parseAuthSession(page.data.session?.session) ?? data.currentSession);
	const currentId = $derived(sessionIdentity(currentSess));
	const authentikUrl = $derived(env.PUBLIC_AUTHENTIK_URL?.replace(/\/$/, '') || null);

	let sessions = $state<AuthSessionView[]>([]);
	let sessionsLoading = $state(true);
	let sessionsError = $state<string | null>(null);
	let revoking = $state<string | null>(null);

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordSaving = $state(false);
	let passwordError = $state<string | null>(null);
	let passwordNote = $state<string | null>(null);

	let mfaPassword = $state('');
	let mfaCode = $state('');
	let mfaBusy = $state(false);
	let mfaError = $state<string | null>(null);
	let mfaNote = $state<string | null>(null);
	let totpUri = $state<string | null>(null);
	let backupCodes = $state<string[]>([]);

	let deleteConfirm = $state('');
	let deleting = $state(false);
	let deleteError = $state<string | null>(null);

	let sendingVerify = $state(false);
	let verifyError = $state<string | null>(null);
	let verifyNote = $state<string | null>(null);

	const totpQr = $derived(
		totpUri
			? `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(totpUri)}`
			: null
	);

	onMount(() => {
		void loadSessions();
	});

	async function sendVerification() {
		if (!user?.email || sendingVerify) return;
		sendingVerify = true;
		verifyError = null;
		verifyNote = null;
		try {
			const result = await authClient.sendVerificationEmail({
				email: user.email,
				callbackURL: '/account/profile/security'
			});
			if (result.error) {
				verifyError = authErrorMessage(result.error, 'Could not send verification email.');
				return;
			}
			verifyNote = 'Verification email sent. Check that inbox.';
		} catch (err) {
			verifyError = err instanceof Error ? err.message : 'Could not send verification email.';
		} finally {
			sendingVerify = false;
		}
	}

	async function loadSessions() {
		sessionsLoading = true;
		sessionsError = null;
		try {
			const result = await authClient.listSessions();
			if (result.error) {
				sessionsError = authErrorMessage(result.error, 'Could not load sessions.');
				sessions = [];
				return;
			}
			sessions = ((result.data ?? []) as AuthSessionView[])
				.map((session) => parseAuthSession(session))
				.filter((session): session is AuthSessionView => session != null);
		} catch (err) {
			sessionsError = err instanceof Error ? err.message : 'Could not load sessions.';
			sessions = [];
		} finally {
			sessionsLoading = false;
		}
	}

	function isCurrent(session: AuthSessionView) {
		const id = sessionIdentity(session);
		return Boolean(currentId && id && currentId === id);
	}

	async function revokeSession(session: AuthSessionView) {
		const token = session.token;
		if (!token) return;
		revoking = token;
		sessionsError = null;
		try {
			const result = await authClient.revokeSession({ token });
			if (result.error) {
				sessionsError = authErrorMessage(result.error, 'Could not end that session.');
				return;
			}
			await loadSessions();
		} catch (err) {
			sessionsError = err instanceof Error ? err.message : 'Could not end that session.';
		} finally {
			revoking = null;
		}
	}

	async function revokeOthers() {
		revoking = 'others';
		sessionsError = null;
		try {
			const result = await authClient.revokeOtherSessions();
			if (result.error) {
				sessionsError = authErrorMessage(result.error, 'Could not sign out other devices.');
				return;
			}
			await loadSessions();
		} catch (err) {
			sessionsError = err instanceof Error ? err.message : 'Could not sign out other devices.';
		} finally {
			revoking = null;
		}
	}

	async function changePassword(event: SubmitEvent) {
		event.preventDefault();
		if (newPassword !== confirmPassword) {
			passwordError = 'New password and confirmation do not match.';
			return;
		}
		passwordSaving = true;
		passwordError = null;
		passwordNote = null;
		try {
			const result = await authClient.changePassword({
				currentPassword,
				newPassword,
				revokeOtherSessions: true
			});
			if (result.error) {
				passwordError = authErrorMessage(
					result.error,
					'Could not change password. If you only sign in with Authentik, change it there.'
				);
				return;
			}
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			passwordNote = 'Password updated. Other devices were signed out.';
			await loadSessions();
		} catch (err) {
			passwordError = err instanceof Error ? err.message : 'Could not change password.';
		} finally {
			passwordSaving = false;
		}
	}

	function readMfaPayload(data: unknown): { totpURI?: string; backupCodes?: string[] } {
		if (typeof data !== 'object' || data == null) return {};
		const body = data as Record<string, unknown>;
		const totpURI = typeof body.totpURI === 'string' ? body.totpURI : undefined;
		const codes = Array.isArray(body.backupCodes)
			? body.backupCodes.filter((code): code is string => typeof code === 'string')
			: [];
		return { totpURI, backupCodes: codes };
	}

	async function enableMfa(event: SubmitEvent) {
		event.preventDefault();
		mfaBusy = true;
		mfaError = null;
		mfaNote = null;
		try {
			const result = await authClient.twoFactor.enable({ password: mfaPassword });
			if (result.error) {
				mfaError = authErrorMessage(
					result.error,
					'Could not start MFA. A Payload / email password is required.'
				);
				return;
			}
			const payload = readMfaPayload(result.data);
			totpUri = payload.totpURI ?? null;
			backupCodes = payload.backupCodes ?? [];
			mfaNote = totpUri
				? 'Scan the code, then enter a one-time code to finish enabling MFA.'
				: 'Enter a one-time code from your authenticator to finish enabling MFA.';
		} catch (err) {
			mfaError = err instanceof Error ? err.message : 'Could not start MFA.';
		} finally {
			mfaBusy = false;
		}
	}

	async function verifyMfa(event: SubmitEvent) {
		event.preventDefault();
		mfaBusy = true;
		mfaError = null;
		try {
			const result = await authClient.twoFactor.verifyTotp({ code: mfaCode, trustDevice: true });
			if (result.error) {
				mfaError = authErrorMessage(result.error, 'That authenticator code is not valid.');
				return;
			}
			mfaCode = '';
			mfaPassword = '';
			totpUri = null;
			mfaNote = 'Authenticator MFA is on for this account.';
			await invalidateAll();
		} catch (err) {
			mfaError = err instanceof Error ? err.message : 'Could not verify MFA.';
		} finally {
			mfaBusy = false;
		}
	}

	async function disableMfa(event: SubmitEvent) {
		event.preventDefault();
		mfaBusy = true;
		mfaError = null;
		mfaNote = null;
		try {
			const result = await authClient.twoFactor.disable({ password: mfaPassword });
			if (result.error) {
				mfaError = authErrorMessage(result.error, 'Could not disable MFA.');
				return;
			}
			mfaPassword = '';
			backupCodes = [];
			totpUri = null;
			mfaNote = 'Authenticator MFA is off.';
			await invalidateAll();
		} catch (err) {
			mfaError = err instanceof Error ? err.message : 'Could not disable MFA.';
		} finally {
			mfaBusy = false;
		}
	}

	async function newBackupCodes() {
		if (!mfaPassword) {
			mfaError = 'Password is required.';
			return;
		}
		mfaBusy = true;
		mfaError = null;
		mfaNote = null;
		try {
			const result = await authClient.twoFactor.generateBackupCodes({ password: mfaPassword });
			if (result.error) {
				mfaError = authErrorMessage(result.error, 'Could not generate backup codes.');
				return;
			}
			const payload = readMfaPayload(result.data);
			backupCodes = payload.backupCodes ?? [];
			mfaNote = backupCodes.length
				? 'New backup codes generated. Store them somewhere safe.'
				: null;
		} catch (err) {
			mfaError = err instanceof Error ? err.message : 'Could not generate backup codes.';
		} finally {
			mfaBusy = false;
		}
	}

	async function deleteAccount(event: SubmitEvent) {
		event.preventDefault();
		if (deleteConfirm !== 'DELETE') {
			deleteError = 'Type DELETE to confirm.';
			return;
		}
		deleting = true;
		deleteError = null;
		try {
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
			deleting = false;
		}
	}
</script>

<svelte:head>
	<title>Security | Profile | itsMillerTime.dev</title>
</svelte:head>

<section class="account-section">
	<div class="account-section__head">
		<h2>Sign-in</h2>
		{#if authentikUrl}
			<a class="account-btn" href={authentikUrl} target="_blank" rel="noopener noreferrer">
				Authentik
			</a>
		{/if}
	</div>
	<p class="account-lede">Password and MFA below are for email login, not Authentik.</p>
</section>

<section class="account-section">
	<h2>Email</h2>
	{#if verifyError}
		<AccountMessage kind="error">{verifyError}</AccountMessage>
	{/if}
	{#if verifyNote}
		<AccountMessage kind="success">{verifyNote}</AccountMessage>
	{/if}
	{#if user?.emailVerified}
		<p class="account-lede">{user.email} is verified.</p>
	{:else if user?.email}
		<p class="account-lede">
			{user.email} isn’t verified. We’ll send a link to this address.
		</p>
		<div class="account-actions">
			<button type="button" class="account-btn" onclick={sendVerification} disabled={sendingVerify}>
				{sendingVerify ? 'Sending…' : 'Send verification'}
			</button>
		</div>
	{:else}
		<p class="account-lede">No email on this account.</p>
	{/if}
</section>

<section class="account-section">
	<h2>Password</h2>
	{#if passwordError}
		<AccountMessage kind="error">{passwordError}</AccountMessage>
	{/if}
	{#if passwordNote}
		<AccountMessage kind="success">{passwordNote}</AccountMessage>
	{/if}
	<form class="account-form" onsubmit={changePassword}>
		<div class="account-row account-row--end">
			<AccountField label="Current">
				<input
					type="password"
					autocomplete="current-password"
					bind:value={currentPassword}
					disabled={passwordSaving}
					required
				/>
			</AccountField>
			<AccountField label="New">
				<input
					type="password"
					autocomplete="new-password"
					bind:value={newPassword}
					disabled={passwordSaving}
					required
				/>
			</AccountField>
			<AccountField label="Confirm">
				<input
					type="password"
					autocomplete="new-password"
					bind:value={confirmPassword}
					disabled={passwordSaving}
					required
				/>
			</AccountField>
			<button type="submit" class="account-btn" disabled={passwordSaving}>
				{passwordSaving ? 'Updating…' : 'Update'}
			</button>
		</div>
	</form>
</section>

<section class="account-section">
	<h2>Authenticator MFA</h2>
	<p class="account-lede">
		{#if user?.twoFactorEnabled}
			On for email/password login.
		{:else}
			Optional for email/password login.
		{/if}
	</p>
	{#if mfaError}
		<AccountMessage kind="error">{mfaError}</AccountMessage>
	{/if}
	{#if mfaNote}
		<AccountMessage kind="success">{mfaNote}</AccountMessage>
	{/if}

	{#if totpQr}
		<img class="account-qr" src={totpQr} alt="Authenticator QR code" width="140" height="140" />
	{/if}
	{#if backupCodes.length}
		<p class="account-hint">Save these backup codes now. They will not be shown again.</p>
		<ul class="account-backup">
			{#each backupCodes as code (code)}
				<li>{code}</li>
			{/each}
		</ul>
	{/if}

	{#if totpUri || backupCodes.length}
		<form class="account-form" onsubmit={verifyMfa}>
			<div class="account-inline">
				<AccountField label="Authenticator code">
					<input
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						bind:value={mfaCode}
						disabled={mfaBusy}
						required
					/>
				</AccountField>
				<button type="submit" class="account-btn" disabled={mfaBusy}>
					{mfaBusy ? 'Verifying…' : 'Verify'}
				</button>
			</div>
		</form>
	{:else if user?.twoFactorEnabled}
		<form class="account-form" onsubmit={disableMfa}>
			<div class="account-inline">
				<AccountField label="Password">
					<input
						type="password"
						autocomplete="current-password"
						bind:value={mfaPassword}
						disabled={mfaBusy}
						required
					/>
				</AccountField>
				<button
					type="button"
					class="account-btn account-btn--ghost"
					disabled={mfaBusy}
					onclick={newBackupCodes}
				>
					{mfaBusy ? 'Working…' : 'New backup codes'}
				</button>
				<button type="submit" class="account-btn account-btn--danger" disabled={mfaBusy}>
					{mfaBusy ? 'Working…' : 'Disable MFA'}
				</button>
			</div>
		</form>
	{:else}
		<form class="account-form" onsubmit={enableMfa}>
			<div class="account-inline">
				<AccountField label="Password">
					<input
						type="password"
						autocomplete="current-password"
						bind:value={mfaPassword}
						disabled={mfaBusy}
						required
					/>
				</AccountField>
				<button type="submit" class="account-btn" disabled={mfaBusy}>
					{mfaBusy ? 'Starting…' : 'Set up'}
				</button>
			</div>
		</form>
	{/if}
</section>

<section class="account-section">
	<h2>Active sessions</h2>
	{#if sessionsError}
		<AccountMessage kind="error">{sessionsError}</AccountMessage>
	{/if}
	{#if sessionsLoading}
		<p class="account-hint">Loading sessions…</p>
	{:else}
		{#each sessions as session (session.token ?? session.id)}
			<div class="account-session">
				<p>
					{formatDateTime(session.createdAt)}
					{#if isCurrent(session)}
						· this device
					{/if}
					{#if session.ipAddress}
						· {session.ipAddress}
					{/if}
					{#if session.userAgent}
						· {session.userAgent}
					{/if}
				</p>
				{#if !isCurrent(session) && session.token}
					<button
						type="button"
						class="account-btn account-btn--ghost"
						disabled={revoking != null}
						onclick={() => revokeSession(session)}
					>
						{revoking === session.token ? 'Ending…' : 'End session'}
					</button>
				{/if}
			</div>
		{/each}
		{#if sessions.some((session) => !isCurrent(session))}
			<div class="account-actions">
				<button
					type="button"
					class="account-btn account-btn--ghost"
					onclick={revokeOthers}
					disabled={revoking != null}
				>
					{revoking === 'others' ? 'Signing out…' : 'Sign out other devices'}
				</button>
			</div>
		{/if}
	{/if}
</section>

<section class="account-section">
	<h2>Delete account</h2>
	{#if deleteError}
		<AccountMessage kind="error">{deleteError}</AccountMessage>
	{/if}
	<form class="account-form" onsubmit={deleteAccount}>
		<div class="account-inline">
			<AccountField label="Type DELETE">
				<input type="text" autocomplete="off" bind:value={deleteConfirm} disabled={deleting} />
			</AccountField>
			<button type="submit" class="account-btn account-btn--danger" disabled={deleting}>
				{deleting ? 'Deleting…' : 'Delete'}
			</button>
		</div>
	</form>
</section>
