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
	let playFilter = $state<'all' | 'played' | 'unplayed'>('all');
	let playerCountFilter = $state<'all' | '1' | '2' | '3' | '4' | '5' | '6'>('all');
	let playtimeFilter = $state<'all' | '30' | '60' | '90' | '120' | '150' | '180'>('all');
	let pickedGame = $state<BggGame | null>(null);
	let isSpinning = $state(false);
	let spinGames = $state<BggGame[]>([]);
	let highlightedSpinIndex = $state(0);
	let spinTick = $state(0);
	let spinTimeout: ReturnType<typeof setTimeout> | null = null;

	const SPIN_VISIBLE_RADIUS = 2;
	const SPIN_MIN_TICKS = 28;
	const SPIN_EXTRA_TICKS = 18;

	$effect(() => {
		lookupUsername = data.username;
	});

	/** Reset filters when the loaded collection changes (new fetch / navigation). */
	$effect(() => {
		void data.username;
		void data.total;
		playFilter = 'all';
		playerCountFilter = 'all';
		playtimeFilter = 'all';
		clearSpinTimer();
		isSpinning = false;
		spinGames = [];
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
		if (isSpinning && spinGames.some((spinGame) => !list.some((g) => g.id === spinGame.id))) {
			clearSpinTimer();
			isSpinning = false;
			spinGames = [];
			pickedGame = null;
		}
	});

	$effect(() => {
		return () => {
			clearSpinTimer();
		};
	});

	function clearSpinTimer() {
		if (spinTimeout) {
			clearTimeout(spinTimeout);
			spinTimeout = null;
		}
	}

	function positiveModulo(value: number, length: number): number {
		return ((value % length) + length) % length;
	}

	function shuffleGames(games: BggGame[]): BggGame[] {
		const shuffled = [...games];
		for (let i = shuffled.length - 1; i > 0; i -= 1) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	function getSpinSlots() {
		if (spinGames.length === 0) return [];

		return Array.from({ length: SPIN_VISIBLE_RADIUS * 2 + 1 }, (_, index) => {
			const offset = index - SPIN_VISIBLE_RADIUS;
			const gameIndex = positiveModulo(highlightedSpinIndex + offset, spinGames.length);
			const game = spinGames[gameIndex];

			return {
				game,
				offset,
				isCenter: offset === 0,
				key: `${game.id}-${offset}`
			};
		});
	}

	const centeredSpinGame = $derived(spinGames[highlightedSpinIndex] ?? null);

	function scheduleSpinTick(totalTicks: number) {
		const progress = spinTick / totalTicks;
		const delay = 55 + Math.pow(progress, 3) * 190;

		spinTimeout = setTimeout(() => {
			if (spinGames.length === 0) return;

			const nextIndex = (highlightedSpinIndex + 1) % spinGames.length;

			spinTick += 1;
			highlightedSpinIndex = nextIndex;

			if (spinTick >= totalTicks) {
				clearSpinTimer();
				isSpinning = false;
				pickedGame = spinGames[nextIndex] ?? null;
				return;
			}

			scheduleSpinTick(totalTicks);
		}, delay);
	}

	function pickRandomGame() {
		const list = displayedGames;
		if (list.length === 0) return;

		clearSpinTimer();
		const wheelGames = shuffleGames(list);
		const finalIndex = Math.floor(Math.random() * wheelGames.length);
		const totalTicks = SPIN_MIN_TICKS + Math.floor(Math.random() * SPIN_EXTRA_TICKS);

		spinGames = wheelGames;
		highlightedSpinIndex = positiveModulo(finalIndex - (totalTicks % wheelGames.length), wheelGames.length);
		spinTick = 0;
		pickedGame = null;
		isSpinning = true;
		scheduleSpinTick(totalTicks);
	}

	function clearPick() {
		clearSpinTimer();
		isSpinning = false;
		spinGames = [];
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
		goto(`/board-games?username=${encodeURIComponent(trimmed)}`);
	}

	function getBgStatsAddPlayHref(game: BggGame): string {
		return `https://app.bgstatsapp.com/addPlay.html?gameId=${encodeURIComponent(String(game.id))}`;
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
					{data.total}
					{data.total === 1 ? 'game' : 'games'} in collection
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

		<form
			class="controls-panel font-oswald"
			onsubmit={(e) => {
				e.preventDefault();
				handleLookup();
			}}
		>
			<div class="filter-group username-filter-group">
				<label class="filter-label" for="bgg-username">BGG username</label>
				<div class="lookup-inline">
					<input
						id="bgg-username"
						class="lookup-input font-special-elite"
						type="text"
						placeholder="BGG username..."
						bind:value={lookupUsername}
					/>
					<button class="lookup-btn font-oswald" type="submit">Fetch</button>
				</div>
			</div>

			{#if !data.error && data.games.length > 0}
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
				<div class="controls-actions">
					{#if pickedGame && !isSpinning}
						<button type="button" class="collection-btn font-oswald" onclick={clearPick}>
							View full collection
						</button>
					{/if}
					<button
						type="button"
						class="pick-btn font-oswald"
						disabled={displayedGames.length === 0 || isSpinning}
						onclick={pickRandomGame}
					>
						{#if isSpinning}
							Spinning...
						{:else}
							Pick a game for me
						{/if}
					</button>
				</div>
			{/if}
		</form>

		{#if isSpinning || pickedGame}
			<section
				class="pick-wheel"
				class:pick-wheel--settled={pickedGame && !isSpinning}
				aria-live="polite"
				aria-busy={isSpinning}
			>
				<p class="picked-kicker font-oswald">{isSpinning ? 'Game roulette' : 'Your pick'}</p>
				<p class="picked-tagline font-special-elite">
					{#if isSpinning}
						Spinning {displayedGames.length}
						{displayedGames.length === 1 ? 'eligible game' : 'eligible games'}...
					{:else}
						The wheel has spoken.
					{/if}
				</p>
				<div class="wheel-window">
					<div class="wheel-pointer" aria-hidden="true"></div>
					<div class="wheel-strip">
						{#each getSpinSlots() as slot (slot.key)}
							<div class="wheel-slot" class:wheel-slot--active={slot.isCenter}>
								<div class="wheel-image-frame">
									{#if slot.game.thumbnail || slot.game.image}
										<img
											class="wheel-image"
											src={slot.game.thumbnail ?? slot.game.image}
											alt={slot.game.name ?? 'Game cover'}
											loading="lazy"
										/>
									{:else}
										<div class="wheel-image-placeholder font-oswald">No image</div>
									{/if}
								</div>
								<p class="wheel-title font-oswald">{slot.game.name ?? 'Mystery game'}</p>
							</div>
						{/each}
					</div>
				</div>

				{#if pickedGame && !isSpinning && centeredSpinGame}
					{@const g = centeredSpinGame}
					<div class="wheel-result">
						<div class="picked-meta">
							<p class="result-eyebrow font-oswald">Tonight's game</p>
							<h2 class="picked-title font-special-elite">{g.name ?? 'Game'}</h2>
							<dl class="picked-dl font-oswald">
								<div class="picked-dl-row">
									<dt>Your plays</dt>
									<dd>{g.numplays ?? '—'}</dd>
								</div>
								<div class="picked-dl-row">
									<dt>Players</dt>
									<dd>
										{#if g.stats?.minplayers != null && g.stats.maxplayers != null}
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
										{formatAvg(g.stats?.rating?.average)}
										{#if g.stats?.rating?.usersrated != null}
											<span class="picked-dl-sub">
												({g.stats.rating.usersrated.toLocaleString()} votes)
											</span>
										{/if}
									</dd>
								</div>
							</dl>
							<div class="picked-actions">
								<a
									class="picked-bgstats-link lookup-btn font-oswald"
									href={getBgStatsAddPlayHref(g)}
									target="_blank"
									rel="noopener noreferrer"
								>
									Open in BG Stats
								</a>
								<a
									class="picked-bgg-link lookup-btn font-oswald"
									href="https://boardgamegeek.com/boardgame/{g.id}"
									target="_blank"
									rel="noopener noreferrer"
								>
									Open on BoardGameGeek
								</a>
							</div>
						</div>
					</div>
				{/if}
			</section>
		{:else}
			<div class="games-flex">
				{#if displayedGames.length === 0 && data.games.length > 0}
					<p class="filter-empty font-oswald">No games match this filter.</p>
				{/if}
				{#each displayedGames as game, i (`${game.id}-${i}`)}
					{@const g = game as BggGame}
					<div class="game-card-wrap">
						<div class="game-popover font-oswald" role="tooltip">
							<p class="game-popover-title">{g.name ?? 'Game'}</p>
							<dl class="game-popover-dl">
								<dt>Your plays</dt>
								<dd>{g.numplays ?? '—'}</dd>
								<dt>Players</dt>
								<dd>
									{#if g.stats?.minplayers != null && g.stats.maxplayers != null}
										{g.stats.minplayers}–{g.stats.maxplayers}
									{:else}
										—
									{/if}
								</dd>
								<dt>Play time</dt>
								<dd>{formatPlayTime(g)}</dd>
								<dt>Avg rating</dt>
								<dd>
									{formatAvg(g.stats?.rating?.average)}
									{#if g.stats?.rating?.usersrated != null}
										<span class="game-popover-sub">
											({g.stats.rating.usersrated.toLocaleString()} votes)
										</span>
									{/if}
								</dd>
							</dl>
						</div>
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

	.controls-panel {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		align-items: flex-end;
		gap: 0.75rem 1rem;
		max-width: 68rem;
		margin-inline: auto;
		padding: 0.85rem 1rem;
		border: 1px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
	}

	.username-filter-group {
		flex: 1 1 16rem;
	}

	.lookup-inline {
		display: flex;
		width: 100%;
		gap: 0.5rem;
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

	.controls-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.65rem;
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

	.collection-btn {
		padding: 0.55rem 1.1rem;
		font-size: 0.85rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		background: var(--color-white-lightest);
		color: var(--color-tertiary-darkest);
		border: 2px solid var(--color-tertiary-lighter);
		cursor: pointer;
		transition:
			border-color 0.2s,
			transform 0.15s ease;
	}

	.collection-btn:hover {
		border-color: var(--color-primary);
		transform: translateY(-2px);
	}

	.pick-wheel {
		margin-block-start: 1.75rem;
		max-width: 58rem;
		margin-inline: auto;
		padding: 1.5rem clamp(0.75rem, 2vw, 1.5rem) 1.75rem;
		text-align: center;
		border: 3px solid var(--color-primary-darker);
		background: var(--color-white-lightest);
		box-shadow: 8px 8px 0 var(--color-primary);
		overflow: hidden;
		--wheel-slot-gap: clamp(0.35rem, 1.5vw, 0.75rem);
		--wheel-slot-width: clamp(5.5rem, 16vw, 8rem);
	}

	.wheel-window {
		position: relative;
		margin-inline: auto;
		padding-block: 1.5rem 1rem;
		width: fit-content;
		max-width: 100%;
		overflow: hidden;
	}

	.wheel-window::before {
		content: '';
		position: absolute;
		z-index: 2;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 2px;
		transform: translateX(-50%);
		background: rgb(0 0 0 / 0.12);
		pointer-events: none;
	}

	.wheel-pointer {
		position: absolute;
		z-index: 4;
		top: 0.15rem;
		left: 50%;
		width: 0;
		height: 0;
		transform: translateX(-50%);
		border-inline: 0.75rem solid transparent;
		border-top: 1rem solid var(--color-primary);
		filter: drop-shadow(0 2px 0 var(--color-tertiary-darkest));
	}

	.wheel-pointer::after {
		content: '';
		position: absolute;
		top: -1.35rem;
		left: -0.35rem;
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 50%;
		background: var(--color-tertiary-darkest);
	}

	.wheel-strip {
		display: flex;
		justify-content: center;
		align-items: stretch;
		gap: var(--wheel-slot-gap);
		width: calc((var(--wheel-slot-width) * 5) + (var(--wheel-slot-gap) * 4));
		max-width: 100%;
	}

	.wheel-slot {
		width: var(--wheel-slot-width);
		flex: 0 0 var(--wheel-slot-width);
		padding: 0.55rem;
		border: 2px solid var(--color-tertiary-lighter);
		background: var(--color-white-lightest);
		box-shadow: 4px 4px 0 rgb(0 0 0 / 0.16);
		opacity: 0.54;
		transform: scale(0.86) rotate(var(--slot-tilt, 0deg));
		transition:
			opacity 0.12s ease,
			transform 0.12s ease,
			border-color 0.12s ease;
	}

	.wheel-slot:nth-child(odd) {
		--slot-tilt: -2deg;
	}

	.wheel-slot:nth-child(even) {
		--slot-tilt: 2deg;
	}

	.wheel-slot--active {
		position: relative;
		z-index: 3;
		border-color: var(--color-primary);
		opacity: 1;
		transform: scale(1.08) rotate(0deg);
		box-shadow: 0 0 0 4px var(--color-primary-darker), 8px 8px 0 rgb(0 0 0 / 0.2);
	}

	.pick-wheel--settled .wheel-slot:not(.wheel-slot--active) {
		opacity: 0.16;
		transform: scale(0.72);
	}

	.pick-wheel--settled .wheel-slot--active {
		transform: scale(1.14);
	}

	.wheel-image-frame {
		aspect-ratio: 1 / 1;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background: var(--color-white-lightest);
		border-bottom: 0.55rem solid #a0522d;
	}

	.wheel-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.wheel-image-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		font-size: 0.7rem;
		color: var(--color-tertiary);
	}

	.wheel-title {
		margin: 0.45rem 0 0;
		font-size: 0.72rem;
		line-height: 1.2;
		color: var(--color-tertiary-darkest);
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
	}

	.wheel-result {
		max-width: 34rem;
		margin: 1.75rem auto 0;
		padding: 1.25rem;
		background:
			linear-gradient(135deg, rgb(255 255 255 / 0.92), rgb(255 255 255 / 0.76)),
			var(--color-white-lightest);
		border: 2px solid var(--color-primary);
		box-shadow: 6px 6px 0 rgb(0 0 0 / 0.12);
		animation: wheel-result-in 0.28s ease-out both;
	}

	@keyframes wheel-result-in {
		from {
			opacity: 0;
			transform: translateY(-0.5rem);
		}

		to {
			opacity: 1;
			transform: translateY(0);
		}
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

	.picked-title {
		margin: 0;
		font-size: clamp(1.35rem, 2.75vw, 1.8rem);
		color: var(--color-primary-darker);
		line-height: 1.2;
	}

	.picked-meta {
		max-width: 38rem;
		margin-inline: auto;
	}

	.result-eyebrow {
		margin: 0 0 0.25rem;
		font-family: var(--font-oswald);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--color-primary);
	}

	.picked-dl {
		margin: 1rem 0 1.25rem;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(7.25rem, 1fr));
		gap: 0.65rem;
		color: var(--color-tertiary-darker);
	}

	.picked-dl-row {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		padding: 0.65rem 0.75rem;
		text-align: left;
		background: rgb(255 255 255 / 0.72);
		border: 1px solid var(--color-tertiary-lighter);
		box-shadow: 3px 3px 0 rgb(0 0 0 / 0.08);
	}

	.picked-dl-row dt {
		margin: 0;
		font-family: var(--font-oswald);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--color-tertiary);
	}

	.picked-dl-row dd {
		margin: 0;
		font-family: var(--font-special-elite);
		font-size: clamp(1rem, 1.75vw, 1.2rem);
		line-height: 1.15;
		color: var(--color-tertiary-darkest);
	}

	.picked-dl-sub {
		display: block;
		margin-top: 0.2rem;
		font-family: var(--font-oswald);
		font-size: 0.7rem;
		color: var(--color-tertiary);
	}

	.picked-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 0.75rem;
		align-items: center;
	}

	.picked-bgg-link {
		text-decoration: none;
		display: inline-block;
	}

	.picked-bgstats-link {
		text-decoration: none;
		display: inline-block;
		background: var(--color-tertiary-darkest);
		border-color: var(--color-tertiary-darkest);
	}

	.picked-bgstats-link:hover {
		background: var(--color-primary-darker);
		border-color: var(--color-primary-darker);
	}

	.games-flex {
		position: relative;
		isolation: isolate;
		margin-block-start: 1.75rem;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(var(--game-cover-width), var(--game-cover-width)));
		grid-auto-rows: var(--shelf-row-height);
		align-items: stretch;
		justify-content: center;
		gap: var(--shelf-row-gap) var(--game-gap);
		max-width: 1400px;
		margin-inline: auto;
		padding: var(--bookcase-padding-block) 0 1.35rem;
		border: clamp(0.75rem, 1.5vw, 1rem) solid #5f2f19;
		background-color: #8b4723;
		background-image: var(--wood-grain-texture);
		background-size: 260px 120px;
		box-shadow:
			inset 0 0 0 3px rgb(255 235 190 / 0.12),
			inset 0 0 2rem rgb(50 22 9 / 0.24),
			0 0.95rem 0 #3d1d10,
			0 1.15rem 1.5rem rgb(0 0 0 / 0.22);
		--bookcase-padding-block: 1rem;
		--game-cover-width: clamp(104px, 10vw, 132px);
		--game-gap: 0.35rem;
		--shelf-board-height: 2.35rem;
		--shelf-row-gap: 1.15rem;
		--shelf-row-height: clamp(13.25rem, 20vw, 15.75rem);
		--wood-grain-texture: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='120' viewBox='0 0 260 120'%3E%3Cg fill='none' stroke-linecap='round'%3E%3Cpath d='M-24 16 C22 5 56 27 102 15 S192 7 284 20' stroke='%23f3c987' stroke-opacity='.22' stroke-width='3'/%3E%3Cpath d='M-18 34 C42 24 76 46 132 33 S218 27 278 42' stroke='%23532513' stroke-opacity='.18' stroke-width='2'/%3E%3Cpath d='M-26 58 C32 46 66 68 118 56 S202 49 286 64' stroke='%23f8d697' stroke-opacity='.16' stroke-width='2.4'/%3E%3Cpath d='M-22 84 C46 74 92 98 152 84 S224 78 284 94' stroke='%23451f0f' stroke-opacity='.2' stroke-width='2.2'/%3E%3Cpath d='M-14 106 C34 96 72 116 126 106 S210 98 278 112' stroke='%23f0be75' stroke-opacity='.14' stroke-width='2'/%3E%3Cellipse cx='72' cy='63' rx='28' ry='9' stroke='%23451f0f' stroke-opacity='.17' stroke-width='2'/%3E%3Cellipse cx='72' cy='63' rx='13' ry='4' stroke='%23f7d28f' stroke-opacity='.13' stroke-width='1.5'/%3E%3Cellipse cx='190' cy='27' rx='20' ry='6' stroke='%23451f0f' stroke-opacity='.14' stroke-width='1.6'/%3E%3C/g%3E%3C/svg%3E");
	}

	.games-flex::before {
		content: '';
		position: absolute;
		z-index: 0;
		inset: var(--bookcase-padding-block) 0 1.35rem;
		background:
			var(--wood-grain-texture),
			repeating-linear-gradient(
				to bottom,
				transparent 0 calc(var(--shelf-row-height) - var(--shelf-board-height)),
				#d18a47 calc(var(--shelf-row-height) - var(--shelf-board-height))
					calc(var(--shelf-row-height) - 1.95rem),
				#b76d35 calc(var(--shelf-row-height) - 1.95rem)
					calc(var(--shelf-row-height) - 0.95rem),
				#7a3a1d calc(var(--shelf-row-height) - 0.95rem)
					calc(var(--shelf-row-height) - 0.32rem),
				#3d1d10 calc(var(--shelf-row-height) - 0.32rem) var(--shelf-row-height),
				rgb(0 0 0 / 0.18) var(--shelf-row-height)
					calc(var(--shelf-row-height) + 0.35rem),
				transparent calc(var(--shelf-row-height) + 0.35rem)
					calc(var(--shelf-row-height) + var(--shelf-row-gap))
			);
		background-size:
			260px 120px,
			auto;
		pointer-events: none;
	}

	.game-card-wrap {
		position: relative;
		box-sizing: border-box;
		z-index: 1;
		display: flex;
		align-items: flex-end;
		justify-content: center;
		width: 100%;
		height: 100%;
		padding-bottom: calc(var(--shelf-board-height) + 0.38rem);
	}

	.game-card-wrap:hover .game-popover,
	.game-card-wrap:focus-within .game-popover {
		opacity: 1;
		visibility: visible;
		pointer-events: auto;
		transform: translate(-50%, -0.35rem);
	}

	.game-popover {
		position: absolute;
		z-index: 20;
		left: 50%;
		bottom: calc(100% + 0.55rem);
		transform: translate(-50%, 0);
		width: min(15.5rem, 78vw);
		padding: 0.8rem 0.9rem;
		font-size: 0.74rem;
		line-height: 1.35;
		color: var(--color-white-lightest);
		background:
			linear-gradient(135deg, rgb(255 255 255 / 0.06), transparent),
			var(--color-tertiary-darkest);
		border: 2px solid var(--color-primary);
		box-shadow:
			5px 5px 0 var(--color-primary-darker),
			0 10px 22px rgb(0 0 0 / 0.28);
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease,
			visibility 0.15s ease;
	}

	.game-popover::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: -8px;
		transform: translateX(-50%) rotate(45deg);
		width: 0.85rem;
		height: 0.85rem;
		background: var(--color-tertiary-darkest);
		border-right: 2px solid var(--color-primary);
		border-bottom: 2px solid var(--color-primary);
	}

	.game-popover-title {
		margin: 0 0 0.5rem;
		font-family: var(--font-special-elite);
		font-size: 0.9rem;
		line-height: 1.2;
		color: var(--color-white-lightest);
		border-bottom: 1px solid rgb(255 255 255 / 0.24);
		padding-bottom: 0.45rem;
	}

	.game-popover-dl {
		margin: 0;
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.22rem 0.75rem;
		align-items: baseline;
	}

	.game-popover-dl dt {
		margin: 0;
		color: var(--color-tertiary-lighter);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
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
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: center;
		align-items: flex-end;
		width: var(--game-cover-width);
		max-height: calc(var(--shelf-row-height) - var(--shelf-board-height) - 1rem);
		flex-shrink: 0;
		text-decoration: none;
		transition:
			transform 0.2s ease,
			box-shadow 0.2s ease,
			filter 0.2s ease;
		overflow: hidden;
		background: transparent;
		box-shadow: 0 0.7rem 0.85rem rgb(0 0 0 / 0.22);
		transform-origin: bottom center;
	}

	.game-card:hover,
	.game-card:focus-visible {
		transform: translateY(-8px) rotate(-1deg);
		box-shadow: 0 0.85rem 1rem rgb(0 0 0 / 0.3);
		filter: saturate(1.05);
	}

	.game-image {
		display: block;
		width: auto;
		max-width: 100%;
		max-height: calc(var(--shelf-row-height) - var(--shelf-board-height) - 1rem);
		object-fit: contain;
	}

	.game-card:hover .game-image,
	.game-card:focus-visible .game-image {
		filter: saturate(1.05);
	}

	.game-image-placeholder {
		width: 100%;
		height: min(150px, calc(var(--shelf-row-height) - var(--shelf-board-height) - 1rem));
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		color: var(--color-tertiary);
	}

	@media (max-width: 768px) {
		.games-flex {
			--game-cover-width: 108px;
			--shelf-row-height: 13.25rem;
		}

		.game-image-placeholder {
			height: 120px;
		}
	}
</style>
