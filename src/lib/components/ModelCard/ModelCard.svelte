<script lang="ts">
	import Image from '$lib/components/Image';
	import type { Kit, Media, Model, ModelsTag } from '$lib/types/payload-types';
	import { convertDate } from '$lib/utils/convertDate';
	import { makeClockifyDurationFriendly } from '$lib/utils/makeClockifyDurationFriendly';

	type ClockifyProject = { duration: string };

	let { model }: { model: Model } = $props();
	let isClockifyLoading = $state(true);
	let completionDate = $derived(convertDate(model.model_meta.completionDate));
	let clockifyProject = $state<ClockifyProject | null>(null);
	const kit = $derived(
		typeof model.model_meta.kit === 'object' && model.model_meta.kit != null
			? (model.model_meta.kit as Kit)
			: null
	);

	const headText = $derived(
		kit
			? `${typeof kit.manufacturer === 'object' && kit.manufacturer !== null ? kit.manufacturer.title : ''} • ${kit.kit_number ?? ''}`
			: ''
	);

	const resolvedTags = $derived(
		(model.model_meta.tags ?? []).filter(
			(tag): tag is ModelsTag => typeof tag === 'object' && tag !== null && 'title' in tag
		)
	);

	let tagsEl = $state<HTMLDivElement | null>(null);

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

	$effect(() => {
		const el = tagsEl;
		const tags = resolvedTags;
		if (!el || tags.length === 0) return;

		function fitTags() {
			if (!el) return;
			const tagEls = Array.from(el.querySelectorAll<HTMLElement>('[data-tag]'));
			const moreEl = el.querySelector<HTMLElement>('[data-more]');

			for (const tagEl of tagEls) {
				tagEl.hidden = false;
			}
			if (moreEl) {
				moreEl.hidden = true;
				moreEl.textContent = '';
			}

			if (el.scrollWidth <= el.clientWidth + 1) return;

			if (moreEl) moreEl.hidden = false;

			let hidden = 0;
			for (let i = tagEls.length - 1; i >= 0; i--) {
				if (el.scrollWidth <= el.clientWidth + 1) break;
				tagEls[i].hidden = true;
				hidden += 1;
				if (moreEl) moreEl.textContent = `+${hidden}`;
			}
		}

		const frame = requestAnimationFrame(fitTags);
		const observer = new ResizeObserver(fitTags);
		observer.observe(el);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});
</script>

{#if !isClockifyLoading}
	<article class={`model-card ${model.model_meta.status.toLowerCase()}`}>
		<div class="contents">
			<p class="head">{headText}</p>
			<div class="card-image">
				<Image
					image={model.model_meta.featuredImage as Media}
					fixedAspectRatio={4 / 3}
					objectFit="cover"
					sizes="(min-width: 768px) 350px, 100vw"
				/>
				<span class={`status ${model.model_meta.status.toLowerCase()}`}
					>{model.model_meta.status.replace('_', ' ').toLowerCase()}</span
				>
				<a href={`/models/${model.slug}`} class="name">{kit?.title ?? ''}</a>
			</div>
			<div class="details">
				<div class="stats">
					<div class="stat-row">
						<span class="stat-label">Scale:</span>
						<span class="value"
							>{kit && typeof kit.scale === 'object' && kit.scale !== null
								? kit.scale.title
								: ''}</span
						>
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
					{#if resolvedTags.length}
						<div class="tags" bind:this={tagsEl}>
							{#each resolvedTags as tag (tag.id)}
								<a data-tag href={`/models?tag=${tag.slug}`}>{tag.title}</a>
							{/each}
							<span class="tags-more" data-more hidden></span>
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
		overflow: hidden;
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
		grid-template-rows: max-content max-content 1fr;
		height: 100%;
		min-width: 0;
		background: var(--color-white-lighter);
		border: 2px solid var(--color-primary-darker);
		border-radius: 10px;
	}
	.head {
		margin-block: 0;
		text-indent: 0;
		text-align: center;
		padding-block: 0.35rem 0.15rem;
		padding-inline: 0.5rem;
		font-size: 18px;
		line-height: 1.2;
		min-width: 0;
		align-self: start;
	}

	.card-image {
		position: relative;
		min-width: 0;
		align-self: start;

		:global(.image-container) {
			width: 100%;
			border-block: 2px solid var(--color-primary-darker);
		}

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
		line-height: 1.25em;
		padding-block-start: 0.25em;
		padding-inline: 0.5rem;
		text-decoration: none;
		color: var(--color-primary);
	}

	.details {
		align-self: end;
		min-width: 0;
		overflow: hidden;
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
		min-width: 0;
	}
	.stat-row {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.25rem 0;
		border-bottom: 1px dotted var(--color-tertiary-darker);
		min-width: 0;
	}
	.stat-label {
		color: var(--color-tertiary);
		font-weight: bold;
		flex-shrink: 0;
	}

	.value,
	.vlaue {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		text-align: right;
	}

	.tags {
		display: flex;
		flex-wrap: nowrap;
		gap: 0.5rem;
		justify-content: center;
		align-items: center;
		font-size: var(--fs-xs);
		max-width: 100%;
		min-width: 0;
		overflow: hidden;

		a,
		.tags-more {
			flex-shrink: 0;
			background: var(--color-tertiary-lighter);
			color: var(--color-white-lighter);
			text-decoration: none;
			padding: 0.25rem 0.5rem;
			transform: skew(-10deg);
		}

		.tags-more {
			cursor: default;
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
