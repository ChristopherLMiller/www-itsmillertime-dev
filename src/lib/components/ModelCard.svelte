<script lang="ts">
	import Image from '$lib/Image.svelte';
	import type { Media, Model } from '$lib/types/payload-types';
	import { convertDate } from '../../utilities/convertDate';
	import { makeClockifyDurationFriendly } from '../../utilities/makeClockifyDurationFriendly';

	let { model }: { model: Model } = $props();
	let completionDate = $derived(convertDate(model.model_meta.completionDate));
	let clockifyProject = $state(null);

	$effect(() => {
		async function getClockifyProjects() {
			if (!model.clockify_project) return;
			const response = await fetch(`/api/clockify/projects/${model.clockify_project}`);

			if (response.ok) {
				clockifyProject = await response.json();
			}
		}

		getClockifyProjects();
	});
</script>

<div class={`model-card ${model.model_meta.status.toLowerCase()}`}>
	<div class="contents">
		<p class="head">
			{model.model_meta.kit.manufacturer.title} • {model.model_meta.kit.kit_number}
		</p>
		<div class="card-image">
			<Image image={model.model_meta.featuredImage as Media} />
			<span class={`status ${model.model_meta.status.toLowerCase()}`}
				>{model.model_meta.status.replace('_', ' ').toLowerCase()}</span
			>
			<p class="name">{model.model_meta.kit.title}</p>
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
							<a href="#">{tag.title}</a>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style lang="postcss">
	.model-card {
		background: linear-gradient(45deg, var(--color-primary), white);
		padding: 14px;
		position: relative;
		border-radius: 10px;
		color: var(--color-primary);
		height: 490px;

		&.in_progress {
			background: linear-gradient(45deg, var(--color-secondary-lighter), white);
		}
		&.not_started {
			background: linear-gradient(45deg, var(--color-tertiary), white);
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
		font-size: var(--fs-xs);
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

		p {
			text-align: center;
			font-size: calc(var(--fs-base) * 0.8);
		}
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
</style>
