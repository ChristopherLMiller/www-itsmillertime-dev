<script lang="ts">
	import { getAvatarUrl, gravatarProfileUrl, hashEmailForGravatar } from '$lib/utils/avatar';

	let {
		image = null,
		email = null,
		label = 'Account',
		fill = false,
		stretch = false,
		size = 128
	}: {
		image?: string | null;
		email?: string | null;
		label?: string;
		fill?: boolean;
		stretch?: boolean;
		size?: number;
	} = $props();

	const uploadedSrc = $derived(typeof image === 'string' && image.trim() ? image.trim() : null);
	const hashPromise = $derived(
		uploadedSrc || typeof email !== 'string' || !email ? null : hashEmailForGravatar(email)
	);
	const gravatarEditUrl = $derived(
		typeof email === 'string' ? gravatarProfileUrl(email) : 'https://gravatar.com'
	);
	const gravatarSize = $derived(fill ? Math.max(size, 256) : size);
</script>

<div
	class="account-avatar-box"
	class:account-avatar-box--fill={fill}
	class:account-avatar-box--stretch={stretch}
>
	{#if uploadedSrc}
		<img
			class="account-avatar"
			class:account-avatar--fill={fill}
			src={uploadedSrc}
			alt={label}
			width={gravatarSize}
			height={gravatarSize}
		/>
	{:else if hashPromise}
		{#await hashPromise}
			<div
				class="account-avatar account-avatar--empty"
				class:account-avatar--fill={fill}
				aria-hidden="true"
			></div>
		{:then hash}
			{@const avatarSrc = getAvatarUrl({
				image: null,
				gravatarHash: hash,
				size: gravatarSize
			})}
			{#if avatarSrc}
				<a
					class="account-avatar-link"
					class:account-avatar-link--fill={fill}
					href={gravatarEditUrl}
					target="_blank"
					rel="noopener noreferrer"
					title="Change photo on Gravatar"
				>
					<img
						class="account-avatar"
						class:account-avatar--fill={fill}
						src={avatarSrc}
						alt={label}
						width={gravatarSize}
						height={gravatarSize}
					/>
				</a>
			{:else}
				<div
					class="account-avatar account-avatar--empty"
					class:account-avatar--fill={fill}
					aria-hidden="true"
				></div>
			{/if}
		{:catch}
			<div
				class="account-avatar account-avatar--empty"
				class:account-avatar--fill={fill}
				aria-hidden="true"
			></div>
		{/await}
	{:else}
		<div
			class="account-avatar account-avatar--empty"
			class:account-avatar--fill={fill}
			aria-hidden="true"
		></div>
	{/if}
</div>

<style>
	.account-avatar-box {
		flex-shrink: 0;
		line-height: 0;
	}

	.account-avatar-box--stretch {
		/* Contribute no intrinsic height so the text block sizes the row. */
		height: 0;
		min-height: 100%;
		aspect-ratio: 1;
		min-width: 0;
		overflow: hidden;
	}

	.account-avatar-box--fill {
		width: 100%;
	}

	.account-avatar-link {
		display: block;
		height: 100%;
		line-height: 0;
	}

	.account-avatar-link--fill {
		width: 100%;
	}

	.account-avatar,
	.account-avatar--empty {
		display: block;
		width: 2.75rem;
		height: 2.75rem;
		object-fit: cover;
		border: 2px solid var(--color-primary-darker);
		background: var(--color-white-darker);
	}

	.account-avatar-box--stretch .account-avatar,
	.account-avatar-box--stretch .account-avatar--empty,
	.account-avatar-box--stretch .account-avatar-link {
		width: 100%;
		height: 100%;
	}

	.account-avatar--fill {
		width: 100%;
		height: auto;
		aspect-ratio: 1;
		border: 0;
		background: #dcd8cf;
	}
</style>
