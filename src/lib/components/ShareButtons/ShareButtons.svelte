<script lang="ts">
	import SocialIcon from '$lib/components/SocialIcon';
	import { generateShareUrl, copyToClipboard } from '$lib/utils/shareUrl';

	type SharePlatform = 'facebook' | 'twitter' | 'linkedin' | 'reddit' | 'link';

	type ShareButtonsProps = {
		url: string;
		title: string;
		description?: string;
		className?: string;
		/** Visual treatment for the surrounding surface. */
		variant?: 'default' | 'on-dark';
		/** Called after a share action is initiated (social platform or copy link). */
		onShare?: (platform: SharePlatform) => void;
	};

	const { url, title, className = '', variant = 'default', onShare }: ShareButtonsProps = $props();

	let copySuccess = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | null = $state(null);

	function handleShare(platform: 'facebook' | 'twitter' | 'linkedin' | 'reddit') {
		const shareUrl = generateShareUrl(platform, url, title);
		window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=600');
		onShare?.(platform);
	}

	async function handleCopyLink() {
		const success = await copyToClipboard(url);
		if (success) {
			copySuccess = true;
			onShare?.('link');
			if (copyTimeout) clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => {
				copySuccess = false;
			}, 2000);
		}
	}
</script>

<div class="share-buttons share-buttons--{variant} {className}">
	<button
		class="share-button share-button--facebook"
		onclick={() => handleShare('facebook')}
		aria-label="Share on Facebook"
		type="button"
	>
		<SocialIcon platform="facebook" size={variant === 'on-dark' ? 16 : 20} color={variant === 'on-dark' ? 'currentColor' : undefined} />
	</button>

	<button
		class="share-button share-button--twitter"
		onclick={() => handleShare('twitter')}
		aria-label="Share on Twitter"
		type="button"
	>
		<SocialIcon platform="twitter" size={variant === 'on-dark' ? 16 : 20} color={variant === 'on-dark' ? 'currentColor' : undefined} />
	</button>

	<button
		class="share-button share-button--linkedin"
		onclick={() => handleShare('linkedin')}
		aria-label="Share on LinkedIn"
		type="button"
	>
		<SocialIcon platform="linkedin" size={variant === 'on-dark' ? 16 : 20} color={variant === 'on-dark' ? 'currentColor' : undefined} />
	</button>

	<button
		class="share-button share-button--reddit"
		onclick={() => handleShare('reddit')}
		aria-label="Share on Reddit"
		type="button"
	>
		<SocialIcon platform="reddit" size={variant === 'on-dark' ? 16 : 20} color={variant === 'on-dark' ? 'currentColor' : undefined} />
	</button>

	<button
		class="share-button share-button--link"
		class:share-button--copied={copySuccess}
		onclick={handleCopyLink}
		aria-label={copySuccess ? 'Link copied!' : 'Copy link'}
		type="button"
	>
		<SocialIcon platform="link" size={variant === 'on-dark' ? 16 : 20} color={variant === 'on-dark' ? 'currentColor' : undefined} />
		{#if copySuccess}
			<span class="copy-feedback">Copied!</span>
		{/if}
	</button>
</div>

<style>
	.share-buttons {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin: 1.5rem 0;
	}

	.share-buttons--on-dark {
		gap: 0.5rem;
		margin: 0;
	}

	.share-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		padding: 0;
		border: 3px solid currentColor;
		border-radius: 4px;
		background: var(--color-white);
		cursor: pointer;
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			border-color 150ms ease,
			background 150ms ease,
			color 150ms ease;
		position: relative;
	}

	.share-buttons--on-dark .share-button {
		width: 2rem;
		height: 2rem;
		border-width: 1px;
		border-radius: 999px;
		border-color: rgba(255, 255, 255, 0.18);
		background: rgba(255, 255, 255, 0.06);
		color: rgba(255, 255, 255, 0.82);
	}

	.share-buttons--on-dark .share-button:hover,
	.share-buttons--on-dark .share-button:focus-visible {
		transform: none;
		box-shadow: none;
		background: rgba(255, 255, 255, 0.12);
		border-color: rgba(255, 255, 255, 0.28);
		color: var(--color-white-lightest);
	}

	.share-buttons--on-dark .share-button--facebook:hover,
	.share-buttons--on-dark .share-button--facebook:focus-visible {
		color: #8cb8ff;
		border-color: rgba(24, 119, 242, 0.45);
		background: rgba(24, 119, 242, 0.16);
	}

	.share-buttons--on-dark .share-button--twitter:hover,
	.share-buttons--on-dark .share-button--twitter:focus-visible {
		color: #ffffff;
		border-color: rgba(255, 255, 255, 0.35);
		background: rgba(255, 255, 255, 0.14);
	}

	.share-buttons--on-dark .share-button--linkedin:hover,
	.share-buttons--on-dark .share-button--linkedin:focus-visible {
		color: #7eb8ff;
		border-color: rgba(10, 102, 194, 0.45);
		background: rgba(10, 102, 194, 0.16);
	}

	.share-buttons--on-dark .share-button--reddit:hover,
	.share-buttons--on-dark .share-button--reddit:focus-visible {
		color: #ff9b6a;
		border-color: rgba(255, 69, 0, 0.45);
		background: rgba(255, 69, 0, 0.16);
	}

	.share-buttons--on-dark .share-button--link:hover,
	.share-buttons--on-dark .share-button--link:focus-visible,
	.share-buttons--on-dark .share-button--link.share-button--copied {
		color: var(--color-secondary);
		border-color: rgba(255, 255, 255, 0.3);
		background: rgba(255, 255, 255, 0.1);
	}

	.share-buttons--on-dark .copy-feedback {
		bottom: -1.35rem;
		color: var(--color-secondary);
	}

	.share-button:hover,
	.share-button:focus-visible {
		transform: translateY(-2px);
		box-shadow: var(--box-shadow-elev-1);
	}

	.share-button:active {
		transform: translateY(0);
		box-shadow: var(--box-shadow-elev-0);
	}

	.share-button:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	/* Platform-specific colors using border-color for the retro look */
	.share-button--facebook {
		border-color: #1877f2;
	}

	.share-button--twitter {
		border-color: #000000;
	}

	.share-button--linkedin {
		border-color: #0a66c2;
	}

	.share-button--reddit {
		border-color: #ff4500;
	}

	.share-button--link {
		border-color: #6b7280;
	}

	.share-button--copied {
		border-color: var(--color-secondary);
		background: var(--color-secondary-lighter);
	}

	.copy-feedback {
		position: absolute;
		bottom: -24px;
		left: 50%;
		transform: translateX(-50%);
		font-size: 0.75rem;
		font-family: var(--font-oswald);
		color: var(--color-secondary-darker);
		white-space: nowrap;
		font-weight: 600;
	}

	/* Responsive stacking for mobile */
	@media (max-width: 480px) {
		.share-buttons {
			justify-content: center;
		}
	}

	/* Respect reduced motion preference */
	@media (prefers-reduced-motion: reduce) {
		.share-button {
			transition: none;
		}

		.share-button:hover {
			transform: none;
		}
	}
</style>
