<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { authClient } from '$lib/auth-client';
	import Panel from '$lib/Panel.svelte';

	let signingOut = $state(false);

	let session = $derived(page.data.session);
	let user = $derived(session?.user);
	let sess = $derived(session?.session);

	$effect(() => {
		if (!user) {
			goto('/account/login');
		}
	});

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

	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	function formatDateTime(dateString: string) {
		return new Date(dateString).toLocaleString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function getInitials(name: string) {
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
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
					{#if user.image}
						<img src={user.image} alt={user.name ?? 'Avatar'} class="avatar" />
					{:else}
						<div class="avatar-placeholder">
							{getInitials(user.displayName || user.name || 'U')}
						</div>
					{/if}
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
							{#if user.twoFactorEnabled}
								<span class="badge secure">2FA Enabled</span>
							{/if}
							{#if !user.emailVerified}
								<span class="badge warning">Email Unverified</span>
							{/if}
							{#if user.banned}
								<span class="badge banned">Banned</span>
							{/if}
						</div>
					</div>
				</div>
			</Panel>
		</div>

		<div class="profile-grid">
			<Panel hasPadding={true} hasBorder={true}>
				<div class="section">
					<h2>Account Details</h2>
					<dl class="details-list">
						<div class="detail-row">
							<dt>User ID</dt>
							<dd class="mono">{user.id}</dd>
						</div>
						<div class="detail-row">
							<dt>Display Name</dt>
							<dd>{user.displayName ?? '—'}</dd>
						</div>
						<div class="detail-row">
							<dt>Member Since</dt>
							<dd>{formatDate(user.createdAt)}</dd>
						</div>
						<div class="detail-row">
							<dt>Last Updated</dt>
							<dd>{formatDateTime(user.updatedAt)}</dd>
						</div>
						<div class="detail-row">
							<dt>Email Verified</dt>
							<dd>
								<span class="status" class:active={user.emailVerified} class:inactive={!user.emailVerified}>
									{user.emailVerified ? 'Yes' : 'No'}
								</span>
							</dd>
						</div>
						<div class="detail-row">
							<dt>Two-Factor Auth</dt>
							<dd>
								<span class="status" class:active={user.twoFactorEnabled} class:inactive={!user.twoFactorEnabled}>
									{user.twoFactorEnabled ? 'Enabled' : 'Disabled'}
								</span>
							</dd>
						</div>
					</dl>
				</div>
			</Panel>

			<Panel hasPadding={true} hasBorder={true}>
				<div class="section">
					<h2>Preferences</h2>
					<dl class="details-list">
						<div class="detail-row">
							<dt>NSFW Filtering</dt>
							<dd>{user.nsfwFiltering ?? '—'}</dd>
						</div>
						{#if user.bggUsername}
							<div class="detail-row">
								<dt>BGG Username</dt>
								<dd>
									<a href="https://boardgamegeek.com/user/{user.bggUsername}" target="_blank" rel="noopener">
										{user.bggUsername}
									</a>
								</dd>
							</div>
						{/if}
					</dl>
				</div>
			</Panel>

			<Panel hasPadding={true} hasBorder={true}>
				<div class="section">
					<h2>Current Session</h2>
					<dl class="details-list">
						<div class="detail-row">
							<dt>Session ID</dt>
							<dd class="mono">{sess.id}</dd>
						</div>
						<div class="detail-row">
							<dt>Created</dt>
							<dd>{formatDateTime(sess.createdAt)}</dd>
						</div>
						<div class="detail-row">
							<dt>Expires</dt>
							<dd>{formatDateTime(sess.expiresAt)}</dd>
						</div>
						<div class="detail-row">
							<dt>IP Address</dt>
							<dd class="mono">{sess.ipAddress}</dd>
						</div>
						<div class="detail-row">
							<dt>User Agent</dt>
							<dd class="user-agent">{sess.userAgent}</dd>
						</div>
					</dl>
				</div>
			</Panel>
		</div>

		<div class="actions">
			<button class="sign-out-btn" onclick={handleSignOut} disabled={signingOut}>
				{signingOut ? 'Signing out...' : 'Sign Out'}
			</button>
		</div>
	{/if}
</div>

<style lang="postcss">
	.profile-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		padding-block: 2rem;
		max-width: 800px;
		margin-inline: auto;
		width: 100%;
	}

	.header-content {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.avatar {
		width: 80px;
		height: 80px;
		border-radius: 50%;
		border: 3px solid var(--color-primary);
		object-fit: cover;
		flex-shrink: 0;
	}

	.avatar-placeholder {
		width: 80px;
		height: 80px;
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
		flex-shrink: 0;
	}

	.header-info {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	h1 {
		font-family: var(--font-permanent-marker);
		font-size: var(--fs-l);
		color: var(--color-primary);
		margin: 0;
		line-height: 1.1;
	}

	.name {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darkest);
		margin: 0;
	}

	.email {
		font-family: var(--font-roboto);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0;
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

	.badge.secure {
		background: oklch(0.55 0.15 145);
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

	.profile-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.section h2 {
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		color: var(--color-primary);
		margin: 0 0 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid var(--color-tertiary-lightest);
	}

	.details-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin: 0;
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

	dd.mono {
		font-family: var(--font-source-code-pro);
	}

	.user-agent {
		font-size: 0.7rem;
		word-break: break-all;
		line-height: 1.4;
		color: var(--color-tertiary);
	}

	.status {
		font-weight: 600;
		font-size: 0.8rem;
	}

	.status.active {
		color: oklch(0.55 0.15 145);
	}

	.status.inactive {
		color: var(--color-primary);
	}

	.actions {
		display: flex;
		justify-content: center;
	}

	.sign-out-btn {
		padding: 0.65rem 2.5rem;
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
</style>
