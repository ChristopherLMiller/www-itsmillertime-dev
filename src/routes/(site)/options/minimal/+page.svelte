<script lang="ts">
</script>

<svelte:head>
	<title>Option 4: Minimal Hub</title>
</svelte:head>

<div class="minimal-container">
	<div class="content">
		<header class="intro">
			<h1>Christopher Miller</h1>
			<p class="subtitle">I build models, take photos, play board games, and write about it all.</p>
		</header>

		<nav class="navigation">
			<a href="/models" class="nav-button">
				<span class="nav-icon">🔨</span>
				<span class="nav-label">Scale Models</span>
			</a>

			<a href="/galleries" class="nav-button">
				<span class="nav-icon">📷</span>
				<span class="nav-label">Photography</span>
			</a>

			<a href="/articles" class="nav-button">
				<span class="nav-icon">🎲</span>
				<span class="nav-label">Board Games</span>
			</a>

			<a href="/articles" class="nav-button">
				<span class="nav-icon">✍️</span>
				<span class="nav-label">Writing</span>
			</a>
		</nav>
	</div>
</div>

<style lang="postcss">
	.minimal-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(
			135deg,
			var(--color-white-lighter) 0%,
			var(--color-primary-lightest) 100%
		);
	}

	.content {
		max-width: 600px;
		width: 100%;
	}

	.intro {
		text-align: center;
		margin-bottom: 3rem;
	}

	.intro h1 {
		font-family: var(--font-special-elite);
		font-size: clamp(3rem, 8vw, 5rem);
		color: var(--color-primary-darker);
		margin: 0 0 1rem 0;
		line-height: 1;
	}

	.subtitle {
		font-family: var(--font-oswald);
		font-size: var(--fs-l);
		color: var(--color-text);
		margin: 0;
		line-height: 1.6;
		max-width: 500px;
		margin: 0 auto;
	}

	.navigation {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1.5rem;
	}

	.nav-button {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
		background: white;
		border: 4px solid var(--color-primary-darker);
		text-decoration: none;
		transition: all 0.3s ease;
		min-height: 180px;

		&:hover {
			transform: translateY(-8px) rotate(-1deg);
			box-shadow: 12px 12px 0 var(--color-primary);

			.nav-icon {
				transform: scale(1.2) rotate(5deg);
			}
		}

		&:active {
			transform: translateY(-4px) rotate(-1deg);
		}
	}

	.nav-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		transition: transform 0.3s ease;
	}

	.nav-label {
		font-family: var(--font-special-elite);
		font-size: var(--fs-l);
		color: var(--color-primary-darker);
		text-align: center;
	}

	@media (max-width: 600px) {
		.navigation {
			grid-template-columns: 1fr;
		}

		.nav-button {
			min-height: 140px;
			padding: 2rem 1.5rem;
		}

		.nav-icon {
			font-size: 3rem;
		}
	}
</style>
