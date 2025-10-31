<script lang="ts">
	import Image from '$lib/components/Image.svelte';
	import type { Media, Model } from '$lib/types/payload-types';
	import { convertDate } from '../../utilities/convertDate';
	import { makeClockifyDurationFriendly } from '../../utilities/makeClockifyDurationFriendly';

	let { model }: { model: Model } = $props();
	let isClockifyLoading = $state(true);
	let completionDate = $derived(convertDate(model.model_meta.completionDate));
	let clockifyProject = $state(null);

	$effect(() => {
		async function getClockifyProjects() {
			if (!model.clockify_project) {
				isClockifyLoading = false;
				return;
			}
			const response = await fetch(`/api/clockify/projects/${model.clockify_project}`);

			if (response.ok) {
				clockifyProject = await response.json();
				isClockifyLoading = false;
			}
		}

		getClockifyProjects();
	});
</script>

{#if !isClockifyLoading}
	<article class={`model-card ${model.model_meta.status.toLowerCase()}`}>
		<div class="contents">
			<p class="head">
				{model.model_meta.kit.manufacturer.title} • {model.model_meta.kit.kit_number}
			</p>
			<div class="card-image">
				<Image image={model.model_meta.featuredImage as Media} />
				<span class={`status ${model.model_meta.status.toLowerCase()}`}
					>{model.model_meta.status.replace('_', ' ').toLowerCase()}</span
				>
				<a href={`/models/${model.slug}`} class="name">{model.model_meta.kit.title}</a>
			</div>
			<div class="details">
				<div class="stats">
					<div class="stat-row">
						<span class="stat-label">Scale:</span>
						<span class="value">{model.model_meta.kit.scale.title}</span>
					</div>
					{#if model.clockify_project}
						<div class="stat-row">
							<div class="stat-label">Build Time:</div>
							<div class="vlaue">
								{clockifyProject &&
									makeClockifyDurationFriendly(clockifyProject.duration, false, true)}
							</div>
						</div>
					{/if}
					{#if model.model_meta.completionDate}
						<div class="stat-row">
							<div class="stat-label">Completed:</div>
							<div class="value">
								{completionDate}
							</div>
						</div>
					{/if}
					{#if model.model_meta.tags?.length}
						<div class="tags">
							{#each model.model_meta.tags as tag}
								{#if typeof tag === 'object' && tag !== null && 'title' in tag}
									<a href={`/models?tags=${tag.slug}`}>{tag.title}</a>
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</div>
	</article>
{:else}
	<article class={`model-card ${model.model_meta.status.toLowerCase()}`}>
		<div class="contents">
			<div class="skeleton-head"></div>
			<div class="skeleton-image"></div>
			<div class="skeleton-details">
				<div class="skeleton-stat"></div>
				<div class="skeleton-stat"></div>
				<div class="skeleton-stat"></div>
			</div>
		</div>
	</article>
{/if}

<style lang="postcss">
	.model-card {
		background: linear-gradient(45deg, var(--color-primary), white);
		padding: 14px;
		position: relative;
		border-radius: 10px;
		color: var(--color-primary);
		height: 490px;
		transition: all 0.2s ease-in-out;

		&.in_progress {
			background: linear-gradient(45deg, var(--color-secondary-lighter), white);
		}
		&.not_started {
			background: linear-gradient(45deg, var(--color-tertiary), white);
		}

		&:hover {
			transform: translateZ(20px) scale(1.05);
			z-index: 1;
			box-shadow: var(--box-shadow-elev-2);
		}
	}
	.contents {
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 32px repeat(2, auto);
		height: 100%;
		background: var(--color-white-lighter);
		border: 2px solid var(--color-primary-darker);
		border-radius: 10px;
	}
	.head {
		text-align: center;
		padding-block-start: 5px;
		font-size: 18px;
	}

	.card-image {
		position: relative;

		.status {
			position: absolute;
			right: 5px;
			top: 10px;
			background: var(--color-primary);
			color: var(--color-white);
			padding: 0.25rem;
			line-height: 1;
			font-size: var(--fs-xs);
			color: var(--color-white-lightest);
			transform: rotate(-2deg);

			&.in_progress {
				background: var(--color-secondary);
			}
			&.not_started {
				background: var(--color-tertiary);
			}
		}
	}

	.name {
		display: block;
		text-align: center;
		font-size: 20px;
		margin-block-end: 0;
		margin-block-end: 0;
		line-height: 1.25em;
		padding-block-start: 0.25em;
		text-decoration: none;
		color: var(--color-primary);
	}

	.details {
		align-self: end;
	}

	.stats {
		display: flex;
		flex-direction: column;
		flex: 1;
		gap: 0.25rem;
		font-size: calc(var(--fs-base) * 0.7);
		font-family: var(--font-oswald);
		padding-inline: 0.5rem;
		padding-block-end: 0.5rem;
	}
	.stat-row {
		display: flex;
		justify-content: space-between;
		padding: 0.25rem 0;
		border-bottom: 1px dotted var(--color-tertiary-darker);
	}
	.stat-label {
		color: var(--color-tertiary);
		font-weight: bold;
	}

	.tags {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		font-size: var(--fs-xs);
		flex-wrap: wrap;

		a {
			background: var(--color-tertiary-lighter);
			color: var(--color-white-lighter);
			text-decoration: none;
			padding: 0.25rem 0.5rem;
			transform: skew(-10deg);
		}
	}

	/* Skeleton loading styles */
	.skeleton-head {
		height: 32px;
		background: linear-gradient(
			90deg,
			var(--color-primary-lighter) 25%,
			var(--color-primary-light) 50%,
			var(--color-primary-lighter) 75%
		);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 4px;
		margin: 5px 0;
	}

	.skeleton-image {
		height: 200px;
		background: linear-gradient(
			90deg,
			var(--color-primary-lighter) 25%,
			var(--color-primary-light) 50%,
			var(--color-primary-lighter) 75%
		);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 8px;
		margin: 10px 0;
	}

	.skeleton-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
	}

	.skeleton-stat {
		height: 16px;
		background: linear-gradient(
			90deg,
			var(--color-primary-lighter) 25%,
			var(--color-primary-light) 50%,
			var(--color-primary-lighter) 75%
		);
		background-size: 200% 100%;
		animation: loading 1.5s infinite;
		border-radius: 2px;
	}

	@keyframes loading {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}
</style>
