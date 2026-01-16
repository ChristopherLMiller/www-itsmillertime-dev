<script lang="ts">
	import Panel from "$lib/Panel.svelte";

	const { data } = $props();
</script>

<svelte:head>
	<title>Board Game Collection</title>
</svelte:head>

<Panel hasBorder hasTexture={false}>
	<div class="board-games-page">
		<header class="page-header">
			<h1>Board Game Collection</h1>
			{#if !data.error && data.games.length > 0}
				<p class="collection-stats">
					{data.total} {data.total === 1 ? 'game' : 'games'} in collection
				</p>
			{/if}
		</header>

		{#if data.error}
			<div class="error-message">
				<p>{data.error}</p>
			</div>
		{:else if data.games.length === 0}
			<div class="loading-message">
				<p>No games found in collection</p>
			</div>
		{:else}
			<div class="games-grid">
				{#each data.games as game (game.id)}
					<a
						href="https://boardgamegeek.com/boardgame/{game.id}"
						target="_blank"
						rel="noopener noreferrer"
						class="game-card"
					>
						<div class="game-image-container">
							{#if game.thumbnail}
								<img src={game.thumbnail} alt={game.name} class="game-image" loading="lazy" />
							{:else}
								<div class="game-image-placeholder">
									<span>No Image</span>
								</div>
							{/if}
						</div>
						<div class="game-info">
							<h3 class="game-title">{game.name}</h3>
							{#if game.yearPublished}
								<p class="game-year">({game.yearPublished})</p>
							{/if}
							<div class="game-stats">
								{#if game.numPlays > 0}
									<span class="stat">Plays: {game.numPlays}</span>
								{/if}
								{#if game.rating > 0}
									<span class="stat">Rating: {game.rating.toFixed(1)}/10</span>
								{/if}
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>
</Panel>

<style>
	.board-games-page {
		padding: clamp(1rem, 1rem + 1vw, 2rem);
	}

	.page-header {
		text-align: center;
		margin-bottom: 3rem;
		padding-bottom: 2rem;
		border-bottom: 3px solid var(--color-primary-darker);
	}

	.page-header h1 {
		font-family: var(--font-special-elite);
		font-size: var(--fs-l);
		color: var(--color-primary-darker);
		margin: 0 0 0.5rem 0;
	}

	.collection-stats {
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		color: var(--color-tertiary-darker);
		margin: 0;
	}

	.error-message,
	.loading-message {
		text-align: center;
		padding: 2rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		color: var(--color-tertiary);
	}

	.games-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.game-card {
		display: flex;
		flex-direction: column;
		background: var(--linen-paper);
		border: var(--border-width) solid var(--color-primary-darker);
		text-decoration: none;
		color: inherit;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		overflow: hidden;
	}

	.game-card:hover {
		transform: translateY(-4px);
		box-shadow: 8px 8px 0 var(--color-primary);
	}

	.game-image-container {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		background: var(--color-tertiary-lighter);
		overflow: hidden;
	}

	.game-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.game-image-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
	}

	.game-info {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.game-title {
		font-family: var(--font-special-elite);
		font-size: var(--fs-xs);
		color: var(--color-primary-darker);
		margin: 0;
		line-height: 1.2;
	}

	.game-year {
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0;
	}

	.game-stats {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.5rem;
	}

	.stat {
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-tertiary-darker);
	}

	@media (max-width: 768px) {
		.games-grid {
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 1rem;
		}
	}
</style>
