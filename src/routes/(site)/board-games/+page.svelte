<script lang="ts">
	import { goto } from '$app/navigation';
	import Panel from '$lib/Panel.svelte';

	type BggGame = {
		id: number;
		name?: string;
		thumbnail?: string;
		image?: string;
		numplays?: number;
		stats?: {
			minplayers?: number;
			maxplayers?: number;
			minplaytime?: number;
			maxplaytime?: number;
			playingtime?: number;
			rating?: {
				average?: string;
				usersrated?: number;
			};
		};
	};

	const { data } = $props();

	let lookupUsername = $state('');
	let statsLevel = $state<'0' | '1'>('0');
	let playFilter = $state<'all' | 'played' | 'unplayed'>('all');
	let playerCountFilter = $state<'all' | '1' | '2' | '3' | '4' | '5' | '6'>('all');
	let playtimeFilter = $state<'all' | '30' | '60' | '90' | '120' | '150' | '180'>('all');
	let pickedGame = $state<BggGame | null>(null);

	$effect(() => {
		lookupUsername = data.username;
		statsLevel = data.stats === 1 ? '1' : '0';
	});

	/** Reset filters when the loaded collection changes (new fetch / navigation). */
	$effect(() => {
		void data.username;
		void data.stats;
		void data.total;
		playFilter = 'all';
		playerCountFilter = 'all';
		playtimeFilter = 'all';
		pickedGame = null;
	});

	/** Show if minimum players is at most N (minplayers ≤ N). E.g. N = 1 shows games with min 1 only. */
	function matchesPlayerCount(g: BggGame, n: number): boolean {
		const s = g.stats;
		if (!s || s.minplayers == null) return true;
		return s.minplayers <= n;
	}

	function getPlaytimeMinMax(s: NonNullable<BggGame['stats']>): {
		min: number;
		max: number;
	} | null {
		const { minplaytime, maxplaytime, playingtime } = s;
		if (minplaytime != null && maxplaytime != null) {
			return { min: minplaytime, max: maxplaytime };
		}
		if (playingtime != null) {
			return { min: playingtime, max: playingtime };
		}
		if (minplaytime != null) {
			return { min: minplaytime, max: minplaytime };
		}
		return null;
	}

	/** Selected minutes T must lie within the game's [minplaytime, maxplaytime] (or single playingtime). */
	function matchesPlaytime(g: BggGame, t: number): boolean {
		const s = g.stats;
		if (!s) return true;
		const range = getPlaytimeMinMax(s);
		if (!range) return true;
		return range.min <= t && t <= range.max;
	}

	const displayedGames = $derived.by(() => {
		const games = data.games as BggGame[];
		if (data.stats !== 1) return games;

		let list = games;

		if (playFilter !== 'all') {
			list = list.filter((g) => {
				const np = g.numplays ?? 0;
				if (playFilter === 'played') return np > 0;
				return np === 0;
			});
		}

		if (playerCountFilter !== 'all') {
			const n = Number(playerCountFilter);
			list = list.filter((g) => matchesPlayerCount(g, n));
		}

		if (playtimeFilter !== 'all') {
			const t = Number(playtimeFilter);
			list = list.filter((g) => matchesPlaytime(g, t));
		}

		return list;
	});

	$effect(() => {
		const list = displayedGames;
		if (pickedGame && !list.some((g) => g.id === pickedGame!.id)) {
			pickedGame = null;
		}
	});

	function pickRandomGame() {
		const list = displayedGames;
		if (list.length === 0) return;
		pickedGame = list[Math.floor(Math.random() * list.length)] as BggGame;
	}

	function clearPick() {
		pickedGame = null;
	}

	function formatAvg(avg: string | undefined): string {
		if (avg == null || avg === '' || avg === 'N/A') return '—';
		const n = Number(avg);
		return Number.isFinite(n) ? n.toFixed(2) : String(avg);
	}

	function formatPlayTime(game: BggGame): string {
		const s = game.stats;
		if (!s) return '—';
		const { minplaytime, maxplaytime, playingtime } = s;
		if (minplaytime != null && maxplaytime != null) {
			if (minplaytime === maxplaytime) return `${minplaytime} min`;
			return `${minplaytime}–${maxplaytime} min`;
		}
		if (playingtime != null) return `${playingtime} min`;
		if (minplaytime != null) return `${minplaytime} min`;
		return '—';
	}

	function handleLookup() {
		const trimmed = lookupUsername.trim();
		if (!trimmed) return;
		goto(
			`/board-games?username=${encodeURIComponent(trimmed)}&stats=${statsLevel}`
		);
	}
</script>

<Panel hasBorder hasTexture={false}>
	<div class="board-games-page">
		<header class="page-header">
			<h1>Board Game Collection</h1>
			<p class="collection-owner font-oswald">
				Viewing collection for <span class="username">{data.username}</span>
			</p>
			{#if !data.error && data.games.length > 0}
				<p class="collection-stats">
					{data.total} {data.total === 1 ? 'game' : 'games'} in collection
				</p>
			{/if}
			<form class="lookup" onsubmit={(e) => { e.preventDefault(); handleLookup(); }}>
				<input
					class="lookup-input font-special-elite"
					type="text"
					placeholder="BGG username..."
					bind:value={lookupUsername}
				/>
				<label class="stats-label font-oswald" for="bgg-stats-level">Detail</label>
				<select
					id="bgg-stats-level"
					class="stats-select font-oswald"
					bind:value={statsLevel}
				>
					<option value="0">Basic</option>
					<option value="1">Full</option>
				</select>
				<button class="lookup-btn font-oswald" type="submit">Fetch</button>
			</form>
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

		{#if data.stats === 1 && !data.error && data.games.length > 0}
			<div class="filters-bar font-oswald">
				<div class="filter-group">
					<label class="filter-label" for="bgg-play-filter">Play status</label>
					<select id="bgg-play-filter" class="filter-select" bind:value={playFilter}>
						<option value="all">All</option>
						<option value="played">Played</option>
						<option value="unplayed">Unplayed</option>
					</select>
				</div>
				<div class="filter-group">
					<label class="filter-label" for="bgg-player-count">Players</label>
					<select id="bgg-player-count" class="filter-select" bind:value={playerCountFilter}>
						<option value="all">Any</option>
						<option value="1">1</option>
						<option value="2">2</option>
						<option value="3">3</option>
						<option value="4">4</option>
						<option value="5">5</option>
						<option value="6">6</option>
					</select>
				</div>
				<div class="filter-group">
					<label class="filter-label" for="bgg-playtime">Play time</label>
					<select id="bgg-playtime" class="filter-select" bind:value={playtimeFilter}>
						<option value="all">Any</option>
						<option value="30">30 min</option>
						<option value="60">1 hr</option>
						<option value="90">1.5 hr</option>
						<option value="120">2 hr</option>
						<option value="150">2.5 hr</option>
						<option value="180">3+</option>
					</select>
				</div>
				<span class="filter-count" aria-live="polite">
					{displayedGames.length}
					{displayedGames.length === 1 ? 'game' : 'games'} displaying
				</span>
			</div>
		{/if}

		{#if !data.error && data.games.length > 0}
			<div class="pick-row">
				<button
					type="button"
					class="pick-btn font-oswald"
					disabled={displayedGames.length === 0}
					onclick={pickRandomGame}
				>
					Pick a game for me
				</button>
			</div>
		{/if}

		{#if pickedGame}
			{@const g = pickedGame}
			<section class="picked-hero" aria-live="polite">
				<p class="picked-kicker font-oswald">Your pick</p>
				<p class="picked-tagline font-special-elite">Here—go play this.</p>
				<div class="picked-card">
					<div class="picked-image-wrap">
						{#if g.thumbnail && g.image}
							<img
								class="picked-image"
								src={g.image}
								alt={g.name ?? 'Game cover'}
								loading="lazy"
							/>
						{:else}
							<div class="picked-placeholder font-oswald">No image</div>
						{/if}
					</div>
					<div class="picked-meta">
						<h2 class="picked-title font-special-elite">{g.name ?? 'Game'}</h2>
						{#if data.stats === 1 && g.stats}
							<dl class="picked-dl font-oswald">
								<div class="picked-dl-row">
									<dt>Your plays</dt>
									<dd>{g.numplays ?? '—'}</dd>
								</div>
								<div class="picked-dl-row">
									<dt>Players</dt>
									<dd>
										{#if g.stats.minplayers != null && g.stats.maxplayers != null}
											{g.stats.minplayers}–{g.stats.maxplayers}
										{:else}
											—
										{/if}
									</dd>
								</div>
								<div class="picked-dl-row">
									<dt>Play time</dt>
									<dd>{formatPlayTime(g)}</dd>
								</div>
								<div class="picked-dl-row">
									<dt>Avg rating</dt>
									<dd>
										{formatAvg(g.stats.rating?.average)}
										{#if g.stats.rating?.usersrated != null}
											<span class="picked-dl-sub">
												({g.stats.rating.usersrated.toLocaleString()} votes)
											</span>
										{/if}
									</dd>
								</div>
							</dl>
						{/if}
						<div class="picked-actions">
							<a
								class="picked-bgg-link lookup-btn font-oswald"
								href="https://boardgamegeek.com/boardgame/{g.id}"
								target="_blank"
								rel="noopener noreferrer"
							>
								Open on BoardGameGeek
							</a>
							<button type="button" class="picked-back font-oswald" onclick={clearPick}>
								Back to collection
							</button>
						</div>
					</div>
				</div>
			</section>
		{:else}
			<div class="games-flex">
				{#if displayedGames.length === 0 && data.games.length > 0}
					<p class="filter-empty font-oswald">No games match this filter.</p>
				{/if}
				{#each displayedGames as game, i (`${game.id}-${i}`)}
					{@const g = game as BggGame}
					<div
						class="game-card-wrap"
						class:game-card-wrap--popover={data.stats === 1 && g.stats}
					>
						{#if data.stats === 1 && g.stats}
							<div class="game-popover font-oswald" role="tooltip">
								<p class="game-popover-title">{g.name ?? 'Game'}</p>
								<dl class="game-popover-dl">
									<dt>Your plays</dt>
									<dd>{g.numplays ?? '—'}</dd>
									<dt>Players</dt>
									<dd>
										{#if g.stats.minplayers != null && g.stats.maxplayers != null}
											{g.stats.minplayers}–{g.stats.maxplayers}
										{:else}
											—
										{/if}
									</dd>
									<dt>Play time</dt>
									<dd>{formatPlayTime(g)}</dd>
									<dt>Avg rating</dt>
									<dd>
										{formatAvg(g.stats.rating?.average)}
										{#if g.stats.rating?.usersrated != null}
											<span class="game-popover-sub">
												({g.stats.rating.usersrated.toLocaleString()} votes)
											</span>
										{/if}
									</dd>
								</dl>
							</div>
						{/if}
						<a
							href="https://boardgamegeek.com/boardgame/{g.id}"
							target="_blank"
							rel="noopener noreferrer"
							class="game-card"
						>
							{#if g.thumbnail}
								<img src={g.image} alt={g.name ?? ''} class="game-image" loading="lazy" />
							{:else}
								<div class="game-image-placeholder">
									<span>No Image</span>
								</div>
							{/if}
						</a>
					</div>
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

	.collection-owner {
		font-size: var(--fs-base);
		color: var(--color-tertiary-darker);
		margin: 0 0 0.25rem;
	}

	.username {
		color: var(--color-primary);
		font-weight: 600;
	}

	.collection-stats {
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		margin: 0 0 1.25rem;
	}

	.lookup {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		max-width: 32rem;
		margin-inline: auto;
	}

	.lookup-input {
		flex: 1 1 10rem;
		min-width: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.9rem;
		border: 1px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
	}

	.lookup-input::placeholder {
		color: var(--color-tertiary-lighter);
	}

	.stats-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-tertiary);
	}

	.stats-select {
		padding: 0.45rem 0.5rem;
		font-size: 0.85rem;
		border: 1px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		cursor: pointer;
	}

	.lookup-btn {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 1px;
		background: var(--color-primary);
		color: var(--color-white-lightest);
		border: 1px solid var(--color-primary);
		cursor: pointer;
		transition: background 0.2s;

		&:hover {
			background: var(--color-primary-darker);
		}
	}

	.error-message,
	.loading-message {
		text-align: center;
		padding: 2rem;
		font-family: var(--font-oswald);
		font-size: var(--fs-base);
		color: var(--color-tertiary);
	}

	.filters-bar {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: flex-end;
		gap: 0.5rem 1rem;
		margin-block-start: 1rem;
		padding: 0.75rem 1rem;
		max-width: 52rem;
		margin-inline: auto;
		border: 1px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
	}

	.filter-count {
		font-size: 0.85rem;
		color: var(--color-tertiary-darker);
		white-space: nowrap;
	}

	.filter-count::before {
		content: '';
		display: inline-block;
		width: 1px;
		height: 1.1em;
		margin-inline: 0.35rem 0.65rem;
		background: var(--color-tertiary-lighter);
		vertical-align: middle;
	}

	.filter-label {
		font-size: 0.8rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-tertiary);
	}

	.filter-select {
		padding: 0.45rem 0.5rem;
		font-size: 0.85rem;
		border: 1px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		cursor: pointer;
		min-width: 10rem;
	}

	.filter-empty {
		width: 100%;
		text-align: center;
		padding: 2rem 1rem;
		margin: 0;
		font-size: var(--fs-base);
		color: var(--color-tertiary);
	}

	.pick-row {
		display: flex;
		justify-content: center;
		margin-block-start: 1rem;
	}

	.pick-btn {
		padding: 0.55rem 1.25rem;
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		background: var(--color-tertiary-darkest);
		color: var(--color-white-lightest);
		border: 2px solid var(--color-primary);
		cursor: pointer;
		transition:
			background 0.2s,
			transform 0.15s ease;
	}

	.pick-btn:hover:not(:disabled) {
		background: var(--color-primary-darker);
		transform: translateY(-2px);
	}

	.pick-btn:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.picked-hero {
		margin-block-start: 1.75rem;
		max-width: 42rem;
		margin-inline: auto;
		padding: 1.5rem 1.25rem 2rem;
		text-align: center;
		border: 3px solid var(--color-primary-darker);
		background: var(--color-white-lightest);
		box-shadow: 8px 8px 0 var(--color-primary);
	}

	.picked-kicker {
		margin: 0 0 0.25rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-primary);
	}

	.picked-tagline {
		margin: 0 0 1.25rem;
		font-size: clamp(1.1rem, 2vw, 1.35rem);
		color: var(--color-tertiary-darker);
	}

	.picked-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.25rem;
	}

	@media (min-width: 640px) {
		.picked-card {
			flex-direction: row;
			align-items: flex-start;
			text-align: left;
		}
	}

	.picked-image-wrap {
		flex-shrink: 0;
		width: 100%;
		max-width: 220px;
		border: 2px solid #a0522d;
		overflow: hidden;
		border-bottom: 15px solid #a0522d;
	}

	.picked-image {
		width: 100%;
		display: block;
	}

	.picked-placeholder {
		min-height: 220px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
		background: var(--color-white-lightest);
	}

	.picked-meta {
		flex: 1;
		min-width: 0;
	}

	.picked-title {
		margin: 0 0 0.75rem;
		font-size: clamp(1.25rem, 2.5vw, 1.6rem);
		color: var(--color-primary-darker);
		line-height: 1.2;
	}

	.picked-dl {
		margin: 0 0 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.85rem;
		color: var(--color-tertiary-darker);
	}

	.picked-dl-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.35rem 0.75rem;
	}

	@media (min-width: 640px) {
		.picked-dl-row {
			justify-content: flex-start;
		}
	}

	.picked-dl-row dt {
		margin: 0;
		font-weight: 600;
		color: var(--color-tertiary);
	}

	.picked-dl-row dd {
		margin: 0;
	}

	.picked-dl-sub {
		display: block;
		font-size: 0.75rem;
		color: var(--color-tertiary);
	}

	.picked-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.65rem;
		align-items: center;
	}

	@media (min-width: 640px) {
		.picked-actions {
			justify-content: flex-start;
		}
	}

	.picked-bgg-link {
		text-decoration: none;
		display: inline-block;
	}

	.picked-back {
		padding: 0.5rem 1rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: transparent;
		color: var(--color-tertiary-darker);
		border: 1px solid var(--color-tertiary-lighter);
		cursor: pointer;
		transition:
			background 0.2s,
			border-color 0.2s;
	}

	.picked-back:hover {
		background: var(--color-white-lightest);
		border-color: var(--color-tertiary);
	}

	.games-flex {
		margin-block-start: 1.5rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0;
		max-width: 1400px;
		align-items: flex-end;
		border-left: 15px solid #a0522d;
		border-right: 15px solid #a0522d;
	}

	.game-card-wrap {
		position: relative;
	}

	/* Bridge hover gap so the pointer can reach the tooltip without flicker */
	.game-card-wrap--popover::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		bottom: 100%;
		height: 0.85rem;
		z-index: 19;
	}

	.game-card-wrap--popover:hover .game-popover,
	.game-card-wrap--popover:focus-within .game-popover {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
	}

	.game-popover {
		position: absolute;
		z-index: 20;
		left: 50%;
		bottom: calc(100% + 0.35rem);
		transform: translateX(-50%);
		min-width: 11.5rem;
		max-width: 16rem;
		padding: 0.65rem 0.75rem;
		font-size: 0.72rem;
		line-height: 1.35;
		color: var(--color-white-lightest);
		background: var(--color-tertiary-darkest);
		border: 1px solid var(--color-primary);
		box-shadow: 4px 4px 0 var(--color-primary-darker);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition: opacity 0.15s ease, visibility 0.15s ease;
	}

	.game-popover::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -6px;
		transform: translateX(-50%);
		border: 6px solid transparent;
		border-top-color: var(--color-primary);
	}

	.game-popover-title {
		margin: 0 0 0.4rem;
		font-family: var(--font-special-elite);
		font-size: 0.8rem;
		color: var(--color-white-lightest);
		border-bottom: 1px solid var(--color-tertiary);
		padding-bottom: 0.35rem;
	}

	.game-popover-dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.15rem 0.65rem;
		align-items: baseline;
	}

	.game-popover-dl dt {
		margin: 0;
		color: var(--color-tertiary-lighter);
		font-weight: 600;
	}

	.game-popover-dl dd {
		margin: 0;
		text-align: right;
	}

	.game-popover-sub {
		display: block;
		font-size: 0.65rem;
		color: var(--color-tertiary-lighter);
		margin-top: 0.1rem;
	}

	.game-card {
		display: block;
		width: 150px;
		flex-shrink: 0;
		text-decoration: none;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease;
		overflow: hidden;
		border-bottom: 15px solid #a0522d;
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
