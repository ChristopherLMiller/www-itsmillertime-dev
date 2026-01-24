<script lang="ts">
	import Panel from "$lib/Panel.svelte";

	const { data } = $props();
</script>


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
		{/if}
		</div>
		</Panel>
			<div class="games-flex">
				{#each data.games as game, i (`${game.id}-${i}`)}
					<a
						href="https://boardgamegeek.com/boardgame/{game.id}"
						target="_blank"
						rel="noopener noreferrer"
						class="game-card"
					>
						{#if game.thumbnail}
							<img src={game.image} alt={game.name} class="game-image" loading="lazy" />
						{:else}
							<div class="game-image-placeholder">
								<span>No Image</span>
							</div>
						{/if}
					</a>
				{/each}
			</div>

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

	.games-flex {
		margin-block-start: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		max-width: 1400px;
		align-items: flex-end;
		border-left: 15px solid #A0522D;
		border-right: 15px solid #A0522D;
	}

	.game-card {
		display: block;
		width: 150px;
		flex-shrink: 0;
		text-decoration: none;
		transition: transform 0.2s ease, box-shadow 0.2s ease;
		overflow: hidden;
		border-bottom: 15px solid #A0522D;
		margin-bottom: 1.5rem;
	}

	.game-card:hover {
		transform: translateY(-4px);
		box-shadow: 8px 8px 0 var(--color-primary);
	}

	.game-image {
		width: 100%;
		display: block;
	}

	.game-image-placeholder {
		width: 100%;
		height: 150px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
	}

	@media (max-width: 768px) {
		.game-card {
			width: 120px;
		}
		
		.game-image-placeholder {
			height: 120px;
		}
	}
</style>
