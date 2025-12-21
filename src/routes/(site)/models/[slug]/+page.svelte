<script lang="ts">
	import { page } from '$app/state';
	import Image from '$lib/components/Image.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Panel from '$lib/Panel.svelte';
	import StickyNote from '$lib/components/StickyNote.svelte';
	import TimelineCard from '$lib/components/TimelineCard.svelte';
	import YouTubeEmbed from '$lib/components/YouTubeEmbed.svelte';
	import { type Media } from '$lib/types/payload-types.js';
	import { convertDate } from '../../../../utilities/convertDate';
	import { makeClockifyDurationFriendly } from '../../../../utilities/makeClockifyDurationFriendly';
	import Disqus from '$lib/components/Disqus.svelte';
	import ShareButtons from '$lib/components/ShareButtons.svelte';
	
	let clockifyProject = $state(null);
	const { data } = $props();

	// Derived values
	const model = $derived(data.model);
	const status = $derived(model.model_meta.status);
	const statusDisplay = $derived(status.replace('_', ' ').toLowerCase());
	const statusClass = $derived(status.toLowerCase());
	const completionDate = $derived(
		model.model_meta.completionDate ? convertDate(model.model_meta.completionDate) : null
	);
	const clockifyDuration = $derived(
		clockifyProject
			? makeClockifyDurationFriendly(clockifyProject.duration, false, true)
			: null
	);

	$effect(() => {
		async function getClockifyProject() {
			if (!data.model.clockify_project) return;
			const response = await fetch(`/api/clockify/projects/${data.model.clockify_project}`);

			if (response.ok) {
				clockifyProject = await response.json();
			}
		}

		getClockifyProject();
	});

</script>

<article style:view-transition-name={`model-${model.slug}`}>
	<Panel hasBorder hasTexture={false}>
		<!-- Hero Section -->
		<div class="hero">
			<div class="hero-image-container">
				<Image image={model.model_meta.featuredImage as Media} />
				<div class="hero-fade"></div>
			</div>
			<div class="hero-content">
			<h1>{model.title}</h1>
			<div class="hero-meta">
				<div class="meta-left">
					<span class="status-badge {statusClass}">{statusDisplay}</span>
					{#if completionDate}
						<span class="meta-item">
							<Icon name="calendar" size={18} />
							<span>{completionDate}</span>
						</span>
					{/if}
					{#if clockifyDuration}
						<span class="meta-item">
							<Icon name="clock" size={18} />
							<span>{clockifyDuration}</span>
						</span>
					{/if}
				</div>
				<ShareButtons url={page.url.href} title={model.title} className="hero-share" />
			</div>
		</div>
	</div>

	<!-- Two-Column Content -->
	<div class="content-grid">
		<!-- Left Column: Build Log Timeline -->
		<div class="main-column">
			{#if model.buildLog && model.buildLog.length > 0}
				<section class="build-log-wrapper">
					<div class="build-log">
						<h2 class="build-log-title">Build Log</h2>
						<hr class="build-log-divider" />
						{#each model.buildLog as entry, i}
							<TimelineCard
								title={entry.title}
								content={entry.content}
								isLast={i === model.buildLog.length - 1}
							/>
						{/each}
					</div>
				</section>
			{/if}
		</div>

		<!-- Right Column: Sidebar -->
		<aside class="sidebar-column">
			<!-- Kit Info -->
			<StickyNote title="About the Kit">
				<div><strong>Manufacturer:</strong> {model.model_meta.kit?.manufacturer?.title}</div>
				<div><strong>Scale:</strong> {model.model_meta.kit?.scale?.title}</div>
				<div><strong>Year Released:</strong> {model.model_meta.kit?.year_released}</div>
				<div><strong>Kit Number:</strong> {model.model_meta.kit?.kit_number}</div>
				{#if model.model_meta.kit?.scalemates}
					<div><a href={model.model_meta.kit.scalemates}>Scalemates Link</a></div>
				{/if}
				{#if model.model_meta?.tags && model.model_meta?.tags.length > 0}
					<div>
						<strong>Tags:</strong>
						{#each model.model_meta.tags as tag, i}
							{#if typeof tag === 'object' && tag !== null}
								{tag.title}{i < model.model_meta.tags.length - 1 ? ', ' : ''}
							{/if}
						{/each}
					</div>
				{/if}
			</StickyNote>

			<!-- Videos -->
			{#if model.model_meta?.videos && model.model_meta.videos.length > 0}
				<div class="videos-section">
					{#each model.model_meta.videos as video}
						{#if video.url}
							<YouTubeEmbed title={video.title} url={video.url} />
						{/if}
					{/each}
				</div>
			{/if}

			<!-- Photos -->
			{#if model.image && model.image.length > 0}
				<div class="photo-grid">
					{#each model.image as image}
						<Image {image} hasLightbox />
					{/each}
				</div>
			{/if}
		</aside>
	</div>

		<!-- Comments Section -->
		<section class="comments-section">
			<h2 class="font-oswald color-primary-darker">Comments</h2>
			<Disqus identifier={`model-${model.slug}`} title={model.title} url={page.url.href} />
		</section>
	</Panel>
</article>

<style lang="postcss">
	/* Hero Section */
	.hero {
		position: relative;
		width: 100%;
		overflow: hidden;
	}

	.hero-image-container {
		position: relative;
		width: 100%;
		z-index: 0;
	}

	.hero-image-container :global(.image-wrapper) {
		width: 100%;
	}

	.hero-image-container :global(img) {
		width: 100%;
		height: auto;
		display: block;
	}

	.hero-fade {
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg,rgba(228, 228, 228, 0) 50%, rgba(228, 228, 228, 1) 90%);
		pointer-events: none;
	}

	.hero-content {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		z-index: 1;
		padding: 2rem;
	}

	.hero-content h1 {
		font-family: var(--font-special-elite);
		font-size: clamp(2rem, 5vw, 3.5rem);
		color: var(--color-primary-darker);
		margin: 0 0 1rem 0;
		text-shadow:
			2px 2px 4px rgba(255, 255, 255, 0.9),
			-1px -1px 2px rgba(255, 255, 255, 0.9);
		line-height: 1.1;
	}

	.hero-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.meta-left {
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.status-badge {
		background: var(--color-primary);
		color: var(--color-white);
		padding: 0.4rem 0.8rem;
		font-size: var(--fs-xs);
		font-family: var(--font-oswald);
		text-transform: capitalize;
		font-weight: 600;
		letter-spacing: 0.05em;
	}

	.status-badge.in_progress {
		background: var(--color-secondary);
	}

	.status-badge.not_started {
		background: var(--color-tertiary);
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-primary-darker);
	}

	:global(.hero-share) {
		margin: 0;
	}

	/* Two-Column Layout */
	.content-grid {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 2rem;
		margin-bottom: 2rem;
		padding: clamp(1rem, 1rem + 1vw, 2rem);
		padding-top: 0;
	}

	.main-column {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.sidebar-column {
		display: flex;
		flex-direction: column;
		gap: 2rem;
		align-self: start;
	}

	.sidebar-column :global(.sticky-note) {
		align-self: center;
	}

	.build-log-wrapper {
		background: linear-gradient(135deg, #c9b287 0%, #b39d6f 100%);
		border: var(--border-width) solid #7a6a4a;
		padding: clamp(1rem, 1rem + 1vw, 2rem);
		border-radius: 4px;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
	}

	.build-log {
		display: flex;
		flex-direction: column;
		gap: 0;
	}

	.build-log-title {
		font-family: var(--font-special-elite);
		font-size: var(--fs-m);
		color: #3d3424;
		margin: 0 0 1rem 0;
	}

	.build-log-divider {
		margin: 0 0 2rem 0;
		border: none;
		border-bottom: 3px solid #7a6a4a;
		opacity: 0.6;
	}

	/* Videos Section */
	.videos-section {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	/* Photo Grid */
	.photo-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.5rem;
		border: var(--border-width) solid var(--color-primary-darker);
		background: var(--linen-paper);
		padding: 0.5rem;
	}

	/* Comments Section */
	.comments-section {
		width: 100%;
		margin-top: 2rem;
		padding: clamp(1rem, 1rem + 1vw, 2rem);
	}

	.comments-section h2 {
		font-size: var(--fs-m);
		margin-bottom: 1rem;
	}

	.placeholder {
		color: var(--color-tertiary);
		font-style: italic;
		margin: 0;
	}

	/* Responsive Design */
	@media (max-width: 768px) {
		.hero-content {
			padding: 1.5rem;
		}

		.hero-content h1 {
			font-size: clamp(1.5rem, 4vw, 2rem);
		}

		.hero-meta {
			flex-direction: column;
			align-items: flex-start;
		}

		.content-grid {
			grid-template-columns: 1fr;
		}

		.photo-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 480px) {
		.hero-content {
			padding: 1rem;
		}
	}
</style>
