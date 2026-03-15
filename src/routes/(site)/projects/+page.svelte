<script lang="ts">
	import Lexical from '$lib/Lexical.svelte';
	import type { PageData } from './$types';
	import type { Project, Media, ProjectsCategory, ProjectsTechnology } from '$lib/types/payload-types';

	let { data }: { data: PageData } = $props();

	// Helper function to map projectStatus to display status
	function getDisplayStatus(status: Project['projectStatus']): string {
		switch (status) {
			case 'inProgress':
			case 'active':
			case 'experimental':
				return 'ACTIVE';
			case 'completed':
				return 'MAINTAINED';
			case 'archived':
				return 'ARCHIVED';
			default:
				return 'ACTIVE';
		}
	}

	// Helper function to get CSS class for status
	function getStatusClass(status: Project['projectStatus']): string {
		switch (status) {
			case 'inProgress':
			case 'active':
			case 'experimental':
				return 'active';
			case 'completed':
				return 'maintained';
			case 'archived':
				return 'archived';
			default:
				return 'active';
		}
	}

	// Helper function to get year from date string
	function getYear(dateString: string): string {
		return new Date(dateString).getFullYear().toString();
	}

	// Helper function to get category title
	function getCategoryTitle(category: Project['category']): string {
		if (!category) return 'Personal';
		if (typeof category === 'number') return 'Personal';
		return category.title || 'Personal';
	}

	// Helper function to get technology names
	function getTechnologyNames(technologies: Project['technologies']): string[] {
		if (!technologies || !Array.isArray(technologies)) return [];
		return technologies.map(tech => {
			if (typeof tech === 'number') return '';
			return tech.title || '';
		}).filter(Boolean);
	}

	// Helper function to get first screenshot URL
	function getFirstScreenshotUrl(screenshots: Project['screenshots']): string | null {
		if (!screenshots || !Array.isArray(screenshots) || screenshots.length === 0) return null;
		const firstScreenshot = screenshots[0];
		if (typeof firstScreenshot === 'number') return null;
		return firstScreenshot.url || null;
	}
</script>

<div class="filing-cabinet">
	{#each data.projects as project}
		{@const displayStatus = getDisplayStatus(project.projectStatus)}
		{@const statusClass = getStatusClass(project.projectStatus)}
		{@const year = getYear(project.createdAt)}
		{@const categoryTitle = getCategoryTitle(project.category)}
		{@const techNames = getTechnologyNames(project.technologies)}
		{@const screenshotUrl = getFirstScreenshotUrl(project.screenshots)}
		<article class="manila-folder">
			<!-- Folder SVG inline -->
			<svg class="folder" viewBox="0 0 450 400">
				<path style="fill:#c2ab7a" d="m112.09 32.76c-6.41 0-13.78-0.01-22.28 0l-27.91 0.31c-33.05 0.38-35.68 0.07-37.75 8.1-0.74 2.07-2.2 4.95-3.22 6.26-1.79 2.3-1.87 7.85-1.87 160.48 0 87.01 0.32 158.51 0.69 158.87 0.37 0.37 92.96 0.55 205.75 0.41l205.06-0.25 0.28-152.72c0.25-148.06 0.19-152.76-1.62-154.5-1.03-0.99-2.43-3.48-3.1-5.53-0.66-2.05-2.4-4.68-3.87-5.84-2.62-2.08-3.26-2.12-29.97-1.63-75.33 0.47-148.74 1.15-228.44 0.7-2.75-0.91-3.92-2.09-5.84-6.26-3.55-7.7-1.03-8.41-45.91-8.4z"/>
				<path style="fill:#d2bb89" d="m172.95 66.21c-17.02 0-23.38 5.73-29.98 19.4-28.49 0.32-98.99 0.45-104.08 0.45-5.1 0-18.41 8.21-18.41 18.4v31.88 212.53 18.38h18.41 110.69 261.53 18.4v-18.38-212.53-31.88-19.84c0-10.19-8.21-18.4-18.4-18.4z"/>
			</svg>
			<span class="tab-label">{project.title}</span>
			<!-- Paper document on top of folder -->
			<div class="paper-document">
				<!-- Top section with photo and stamps -->
				<div class="document-header">
					{#if screenshotUrl}
						<div class="attached-photo">
							<div class="photo-tape"></div>
							<img src={screenshotUrl} alt={project.title} />
							<div class="photo-caption">FIG. 1</div>
						</div>
					{/if}
					<div class="header-stamps">
						<div class="classification-stamp {statusClass}">{displayStatus}</div>
						<div class="date-stamp">EST. {year}</div>
						{#if project.version}
							<div class="version-stamp">{project.version}</div>
						{/if}
					</div>
				</div>
				
				<!-- Typed report section -->
				<div class="typed-report">
					<div class="report-header">
						<span class="report-title">PROJECT DOSSIER</span>
						<span class="report-id">#{String(project.id).padStart(4, '0')}</span>
					</div>
					
					<div class="report-field">
						<span class="field-label">SUBJECT:</span>
						<span class="field-value">{project.title}</span>
					</div>
					
					<div class="report-field">
						<span class="field-label">CLASSIFICATION:</span>
						<span class="field-value">{categoryTitle}</span>
					</div>
					
					{#if techNames.length > 0}
						<div class="report-field">
							<span class="field-label">TECHNOLOGIES:</span>
							<span class="field-value">{techNames.join(', ')}</span>
						</div>
					{/if}
					
					<div class="report-body">
						<span class="field-label">SUMMARY:</span>
						{#if project.content?.root?.children?.length}
							<div class="report-content">
								<Lexical data={project.content} />
							</div>
						{:else}
							<p>{project.shortDescription}</p>
						{/if}
					</div>
				</div>
				
				<!-- Links section -->
				{#if project.links && project.links.length > 0}
					<div class="document-links">
						<div class="links-header">EXTERNAL REFERENCES</div>
						<div class="link-tags">
							{#each project.links as link}
								<a href={link.url} target="_blank" rel="noopener noreferrer" class="link-tag {link.type}">
									{link.label || link.type}
								</a>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		</article>
	{/each}
</div>

<style lang="postcss">
	.filing-cabinet {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 3rem 4rem;
		padding: 2rem;
	}

	.manila-folder {
		position: relative;
		transition: transform 0.2s;

		&:hover {
			transform: translateY(-5px);
			z-index: 10;
		}
	}

	/* Folder SVG - positioned behind paper, rotated 90 degrees */
	.folder {
		position: absolute;
		width: 140%;
		height: 140%;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%) rotate(90deg);
		z-index: 1;
		filter: drop-shadow(4px 4px 8px rgba(0,0,0,0.3));
	}

	/* Tab label - positioned on the folder's tab area (top left of SVG) */
	.tab-label {
		position: absolute;
		left: 5%;
		top: 2%;
		font-family: var(--font-special-elite);
		font-size: var(--fs-xs);
		color: #333;
		z-index: 3;
		max-width: 25%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* Paper document - 8.5" x 11" US Letter, positioned on folder */
	.paper-document {
		position: relative;
		aspect-ratio: 8.5 / 11;
		margin: 12% 8% 5% 8%;
		background: #fff;
		background-image: 
			linear-gradient(90deg, transparent 0px, transparent 3px, rgba(200, 0, 0, 0.15) 3px, rgba(200, 0, 0, 0.15) 4px, transparent 4px),
			repeating-linear-gradient(0deg, transparent 0px, transparent 23px, #e8e8e8 23px, #e8e8e8 24px);
		background-position: 30px 0;
		border-radius: 3px;
		box-shadow: 
			2px 2px 8px rgba(0,0,0,0.15),
			0 0 0 1px rgba(0,0,0,0.05);
		padding: 1.5rem;
		padding-left: 45px;
		overflow: auto;
		z-index: 2;
	}

	/* Document header with photo and stamps */
	.document-header {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px dashed #ccc;
	}

	.attached-photo {
		position: relative;
		flex-shrink: 0;
	}

	.photo-tape {
		position: absolute;
		top: -8px;
		left: 50%;
		transform: translateX(-50%);
		width: 50px;
		height: 18px;
		background: rgba(255, 255, 200, 0.7);
		box-shadow: 0 1px 2px rgba(0,0,0,0.1);
		z-index: 2;
	}

	.attached-photo img {
		width: 120px;
		height: 75px;
		object-fit: cover;
		box-shadow: 1px 1px 4px rgba(0,0,0,0.3);
		border: 3px solid white;
	}

	.photo-caption {
		text-align: center;
		font-size: calc(var(--fs-xs) * 0.7);
		color: #666;
		margin-top: 2px;
		font-family: var(--font-special-elite);
	}

	.header-stamps {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.classification-stamp {
		padding: 4px 12px;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		font-weight: bold;
		border: 3px solid;
		transform: rotate(-3deg);
		
		&.active { color: #c41e3a; border-color: #c41e3a; background: rgba(196, 30, 58, 0.1); }
		&.maintained { color: #2e7d32; border-color: #2e7d32; background: rgba(46, 125, 50, 0.1); }
		&.archived { color: #555; border-color: #555; background: rgba(85, 85, 85, 0.1); }
	}

	.date-stamp {
		font-family: var(--font-special-elite);
		font-size: calc(var(--fs-xs) * 0.85);
		color: #666;
	}

	.version-stamp {
		font-family: var(--font-source-code-pro);
		font-size: calc(var(--fs-xs) * 0.9);
		color: #444;
		background: #f5f5f5;
		padding: 2px 8px;
		border-radius: 3px;
		box-shadow: 0 1px 2px rgba(0,0,0,0.1);
	}

	/* Typed report content */
	.typed-report {
		font-family: var(--font-special-elite);
		font-size: calc(var(--fs-xs) * 0.9);
	}

	.report-header {
		display: flex;
		justify-content: space-between;
		border-bottom: 2px solid #333;
		padding-bottom: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.report-title {
		font-weight: bold;
		letter-spacing: 2px;
		color: #333;
	}

	.report-id {
		color: #666;
	}

	.report-field {
		display: flex;
		gap: 0.5rem;
		margin: 0.4rem 0;
		line-height: 1.4;
	}

	.report-field .field-label {
		font-weight: bold;
		color: #555;
		min-width: 110px;
		flex-shrink: 0;
	}

	.report-field .field-value {
		color: #222;
	}

	.report-body {
		margin-top: 0.75rem;
		
		.field-label {
			font-weight: bold;
			color: #555;
			display: block;
			margin-bottom: 0.25rem;
		}

		p {
			margin: 0;
			color: #333;
			line-height: 1.5;
			padding-left: 0.5rem;
			border-left: 2px solid #999;
		}

		.report-content {
			padding-left: 0.5rem;
			border-left: 2px solid #999;
			color: #333;
			line-height: 1.5;
		}

		.report-content :global(p) {
			margin: 0 0 0.5rem;
		}

		.report-content :global(p:last-child) {
			margin-bottom: 0;
		}
	}

	/* Links section */
	.document-links {
		margin-top: 1rem;
		padding: 0.75rem;
		background: #f9f9f9;
		border-radius: 4px;
		border: 1px solid #ddd;
	}

	.links-header {
		font-family: var(--font-oswald);
		font-size: calc(var(--fs-xs) * 0.85);
		color: #666;
		letter-spacing: 1px;
		margin-bottom: 0.5rem;
	}

	.link-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.link-tag {
		font-family: var(--font-special-elite);
		font-size: calc(var(--fs-xs) * 0.85);
		padding: 4px 10px;
		text-decoration: none;
		border-radius: 3px;
		transition: all 0.15s;
		
		&.github {
			background: #24292e;
			color: #fff;
			&:hover { background: #1a1e22; }
		}
		&.website,
		&.live {
			background: #0066cc;
			color: #fff;
			&:hover { background: #0055aa; }
		}
		&.custom {
			background: #666;
			color: #fff;
			&:hover { background: #555; }
		}
		&.npm {
			background: #cb3837;
			color: #fff;
			&:hover { background: #b52e2e; }
		}
		&.docs {
			background: #5c4d7d;
			color: #fff;
			&:hover { background: #4a3d66; }
		}
		&.demo {
			background: #2e7d32;
			color: #fff;
			&:hover { background: #256428; }
		}
	}

	@media (max-width: 900px) {
		.filing-cabinet {
			grid-template-columns: 1fr;
		}
	}
</style>
