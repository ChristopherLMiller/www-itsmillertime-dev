<script lang="ts">
	import Panel from '$lib/Panel.svelte';
</script>

<Panel hasBorder hasPadding>
	<h1 class="font-special-elite">Home Page Options</h1>
	<p>Preview different home page designs for a multi-interest showcase site:</p>

	<div class="options-grid">
		<a href="/options/gallery" class="option-card">
			<h2>Option 1: Gallery Grid</h2>
			<p>Visual masonry grid mixing all your content - models, photos, games, articles.</p>
		</a>

		<a href="/options/cards" class="option-card">
			<h2>Option 2: Category Cards</h2>
			<p>Big navigational cards for each interest area with featured images.</p>
		</a>

		<a href="/options/latest" class="option-card">
			<h2>Option 3: Latest of Everything</h2>
			<p>Show the most recent item from each category in a clean grid.</p>
		</a>

		<a href="/options/minimal" class="option-card">
			<h2>Option 4: Minimal Hub</h2>
			<p>Simple introduction with big buttons to each section. Clean and direct.</p>
		</a>

		<a href="/options/random" class="option-card">
			<h2>Option 5: Random Feature</h2>
			<p>Randomly showcase different content on each visit. Keeps it fresh.</p>
		</a>
	</div>
</Panel>

<style lang="postcss">
	h1 {
		font-size: var(--fs-xl);
		color: var(--color-primary-darker);
		margin-bottom: 1rem;
	}

	.options-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin-top: 2rem;
	}

	.option-card {
		display: block;
		padding: 1.5rem;
		border: 3px solid var(--color-primary-darker);
		background: var(--color-white);
		text-decoration: none;
		color: inherit;
		transition: all 0.2s ease;

		&:hover {
			transform: translateY(-4px);
			box-shadow: 6px 6px 0 var(--color-primary-darker);
		}

		h2 {
			font-family: var(--font-oswald);
			font-size: var(--fs-m);
			color: var(--color-primary-darker);
			margin-bottom: 0.5rem;
		}

		p {
			margin: 0;
			color: var(--color-text);
		}
	}
</style>
