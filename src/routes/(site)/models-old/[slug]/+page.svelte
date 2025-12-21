<script lang="ts">
	import Accordian from '$lib/components/Accordian.svelte';
	import Image from '$lib/components/Image.svelte';
	import Lexical from '$lib/Lexical.svelte';
	import Panel from '$lib/Panel.svelte';
	import { type Media, type Model } from '$lib/types/payload-types.js';
	import { makeClockifyDurationFriendly } from '../../../../utilities/makeClockifyDurationFriendly';

	let clockifyProject = $state(null);
	const { data } = $props();

	$effect(() => {
		async function getClockifyProject() {
				if (!data.model.clockify_project) return;
				const response = await fetch(
					`/api/clockify/projects/${data.model.clockify_project}`
				);

				if (response.ok) {
					clockifyProject = await response.json();
				}
		}

		getClockifyProject();
	});

</script>

<article style:view-transition-name={`model-${data?.model?.slug}`}>
	<div class="split-column">
		<div class="column first">
			<Image hasBorder image={data?.model?.model_meta.featuredImage as Media} />
			{#if data?.model?.buildLog && data?.model?.buildLog?.length > 0}
				<Panel hasBorder>
					<h3 class="font-oswald text-center color-primary-darker">Build Log</h3>
					{#each data?.model?.buildLog as part}
						<Accordian summary={part.title}>
							<Lexical data={part.content} />
						</Accordian>
					{/each}
				</Panel>
			{/if}
		</div>
		<div class="column second">
			<Panel hasBorder hasPadding>
				<h1 class="font-oswald text-medium color-primary-darker">
					{data?.model?.title}
				</h1>
				{#if data?.model?.model_meta.completionDate}
					<p>
						{data?.model?.model_meta.status} on {new Date(
							data?.model?.model_meta.completionDate
						).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'long',
							day: 'numeric'
						})}
					</p>
				{/if}
			</Panel>
			<Panel hasBorder hasPadding>
				<h2 class="font-oswald text-medium color-primary-darker">About the Kit</h2>
				<p>Manufacturer: {data?.model?.model_meta.kit?.manufacturer?.title}</p>
				<p>Scale: {data?.model?.model_meta.kit?.scale?.title}</p>
				<p>Year Released: {data?.model?.model_meta.kit?.year_released}</p>
				<p>Kit Number: {data?.model?.model_meta.kit?.kit_number}</p>
				<a href={data?.model?.model_meta.kit?.scalemates}>Scalemates Link</a>
				<p>
					Build Time: {clockifyProject &&
						makeClockifyDurationFriendly(clockifyProject.duration, false, true)}
				</p>
			</Panel>
			{#if data?.model?.model_meta?.videos && data?.model?.model_meta?.videos.length > 0}
				<Panel hasBorder hasPadding>
					<h2 class="font-oswald text-medium color-primary-darker">Videos</h2>
					{#each data?.model?.model_meta?.videos as video}
						<a href={video.link}>{video.title}</a>
					{/each}
				</Panel>
			{/if}
			{#if data?.model?.image && data?.model?.image?.length > 0}
				<div
					class="image-grid"
					style:grid-template-columns={`repeat(${data?.model?.image?.length <= 3 ? data?.model?.image?.length : data?.model?.image?.length % 3 === 1 ? 2 : 3}, 1fr)`}
				>
					{#each data?.model?.image as image}
						<Image {image} hasLightbox />
					{/each}
				</div>
			{/if}
		</div>
	</div>
</article>

<style lang="postcss">
	.split-column {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 2rem;
	}
	.column {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.column.first {
		grid-column: span 4;
	}
	.column.second {
		grid-column: span 2;
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border: var(--border-width) solid var(--color-primary-darker);
		background: var(--linen-paper);
	}
</style>