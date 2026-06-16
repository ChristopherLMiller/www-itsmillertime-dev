<script lang="ts">
	import { page } from '$app/state';
	import Lexical from '$lib/components/Lexical';
	import { PUBLIC_PAYLOAD_URL } from '$env/static/public';
	import type { PageData } from './$types';
	import type { Project } from '$lib/types/payload-types';

	let { data }: { data: PageData } = $props();

	const isAdmin = $derived(
		!!page.data.session?.user &&
			(page.data.session?.user?.role as string[] | undefined)?.includes('admin')
	);

	function cmsEditHref(project: Project): string | null {
		return isAdmin && project.id != null
			? `${PUBLIC_PAYLOAD_URL}/admin/collections/projects/${project.id}`
			: null;
	}

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

	// Year the dossier was opened (CMS createdAt)
	function getFiledLabel(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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
		return technologies
			.map((tech) => {
				if (typeof tech === 'number') return '';
				return tech.title || '';
			})
			.filter(Boolean);
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
	{#each data.projects as project (project.id)}
		{@const displayStatus = getDisplayStatus(project.projectStatus)}
		{@const statusClass = getStatusClass(project.projectStatus)}
		{@const filedLabel = getFiledLabel(project.createdAt)}
		{@const categoryTitle = getCategoryTitle(project.category)}
		{@const techNames = getTechnologyNames(project.technologies)}
		{@const screenshotUrl = getFirstScreenshotUrl(project.screenshots)}
		{@const editHref = cmsEditHref(project)}
		<article class="manila-folder" id="project-{project.id}">
			<!-- Folder SVG inline -->
			<svg class="folder" viewBox="0 0 450 400">
				<path
					style="fill:#c2ab7a"
					d="m112.09 32.76c-6.41 0-13.78-0.01-22.28 0l-27.91 0.31c-33.05 0.38-35.68 0.07-37.75 8.1-0.74 2.07-2.2 4.95-3.22 6.26-1.79 2.3-1.87 7.85-1.87 160.48 0 87.01 0.32 158.51 0.69 158.87 0.37 0.37 92.96 0.55 205.75 0.41l205.06-0.25 0.28-152.72c0.25-148.06 0.19-152.76-1.62-154.5-1.03-0.99-2.43-3.48-3.1-5.53-0.66-2.05-2.4-4.68-3.87-5.84-2.62-2.08-3.26-2.12-29.97-1.63-75.33 0.47-148.74 1.15-228.44 0.7-2.75-0.91-3.92-2.09-5.84-6.26-3.55-7.7-1.03-8.41-45.91-8.4z"
				/>
				<path
					style="fill:#d2bb89"
					d="m172.95 66.21c-17.02 0-23.38 5.73-29.98 19.4-28.49 0.32-98.99 0.45-104.08 0.45-5.1 0-18.41 8.21-18.41 18.4v31.88 212.53 18.38h18.41 110.69 261.53 18.4v-18.38-212.53-31.88-19.84c0-10.19-8.21-18.4-18.4-18.4z"
				/>
			</svg>
			<!-- Paper document on top of folder -->
			<div class="paper-document">
				<!-- Top section with photo and stamps -->
				{#if screenshotUrl}
					<div class="document-header">
						<div class="attached-photo">
							<div class="photo-tape"></div>
							<img src={screenshotUrl} alt={project.title} />
							<div class="photo-caption">FIG. 1</div>
						</div>
					</div>
				{/if}

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

					<div class="report-field report-field--inline-meta">
						<span class="field-label">CLASSIFICATION:</span>
						<span class="field-value">
							{categoryTitle}
							{#if editHref}
								<span class="meta-sep" aria-hidden="true">|</span>
								<a
									href={editHref}
									target="_blank"
									rel="noopener noreferrer"
									class="cms-edit-link"
									aria-label="Edit this project in the CMS (opens in a new tab)"
								>
									Edit in CMS
								</a>
							{/if}
						</span>
					</div>

					{#if techNames.length > 0}
						<div class="report-field">
							<span class="field-label">TECHNOLOGIES:</span>
							<span class="field-value project-tech-tags">
								{#each techNames as tech (tech)}
									<span class="project-tech-tag">{tech}</span>
								{/each}
							</span>
						</div>
					{/if}

					<div class="report-field report-field--meta">
						<span class="field-label">FILED:</span>
						<span class="field-value">{filedLabel}</span>
						{#if project.version}
							<span class="version-badge" title="Current version">{project.version}</span>
						{/if}
					</div>

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

					<div class="classification-footer">
						<div class="classification-stamp classification-stamp--footer {statusClass}">
							{displayStatus}
						</div>
					</div>
				</div>

				<!-- Links section -->
				{#if project.links && project.links.length > 0}
					<div class="document-links">
						<div class="links-header">EXTERNAL REFERENCES</div>
						<div class="link-tags">
							{#each project.links as link (link.id ?? link.url)}
								<a
									href={link.url}
									target="_blank"
									rel="noopener noreferrer"
									class="link-tag {link.type}"
								>
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
		filter: drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.3));
	}

	/* Paper document - 8.5" x 11" US Letter, positioned on folder */
	.paper-document {
		--ruled-step: 24px;
		position: relative;
		aspect-ratio: 8.5 / 11;
		margin: 12% 8% 5% 8%;
		background: #fff;
		background-image:
			linear-gradient(
				to bottom,
				#fff 0px,
				#fff calc(var(--ruled-step) * 2 - 1px),
				transparent calc(var(--ruled-step) * 2)
			),
			repeating-linear-gradient(
				0deg,
				transparent 0px,
				transparent calc(var(--ruled-step) - 1px),
				#e8e8e8 calc(var(--ruled-step) - 1px),
				#e8e8e8 var(--ruled-step)
			);
		background-position:
			40px 0,
			30px 0;
		background-size:
			calc(100% - 40px) 100%,
			auto;
		border-radius: 3px;
		box-shadow:
			2px 2px 8px rgba(0, 0, 0, 0.15),
			0 0 0 1px rgba(0, 0, 0, 0.05);
		padding: var(--ruled-step) 1.5rem var(--ruled-step) 35px;
		overflow: auto;
		z-index: 2;

		&::before {
			content: '';
			position: absolute;
			top: 0;
			bottom: 0;
			left: 33px;
			width: 1px;
			background: rgba(200, 0, 0, 0.15);
			pointer-events: none;
		}
	}

	/* Document header with photo */
	.document-header {
		display: flex;
		gap: 1rem;
		margin-bottom: var(--ruled-step);
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
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
		z-index: 2;
	}

	.attached-photo img {
		width: 120px;
		height: 75px;
		object-fit: cover;
		box-shadow: 1px 1px 4px rgba(0, 0, 0, 0.3);
		border: 3px solid white;
	}

	.photo-caption {
		text-align: center;
		font-size: calc(var(--fs-xs) * 0.7);
		color: #666;
		margin-top: 2px;
		font-family: var(--font-special-elite);
	}


	.classification-stamp {
		padding: 4px 12px;
		font-family: var(--font-oswald);
		font-size: var(--fs-xs);
		font-weight: bold;
		border: 3px solid;
		transform: rotate(-3deg);
		line-height: 1.2;

		&.active {
			color: #c41e3a;
			border-color: #c41e3a;
			background: rgba(196, 30, 58, 0.1);
		}
		&.maintained {
			color: #2e7d32;
			border-color: #2e7d32;
			background: rgba(46, 125, 50, 0.1);
		}
		&.archived {
			color: #555;
			border-color: #555;
			background: rgba(85, 85, 85, 0.1);
		}
	}

	.classification-stamp--footer {
		font-size: calc(var(--fs-xs) * 1.35);
		padding: 0.45rem 1.35rem;
		border-width: 4px;
		letter-spacing: 0.12em;
	}

	.classification-footer {
		display: flex;
		justify-content: center;
		margin-top: var(--ruled-step);
		padding-top: calc(var(--ruled-step) * 0.5);
	}

	/* Typed report content — line-height matches ruled paper */
	.typed-report {
		font-family: var(--font-special-elite);
		font-size: var(--fs-xs);
		line-height: var(--ruled-step);
	}

	.report-header {
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-rows: var(--ruled-step) var(--ruled-step);
		height: calc(var(--ruled-step) * 2);
		margin-bottom: var(--ruled-step);
		background-image: linear-gradient(#333, #333);
		background-size: 100% 2px;
		background-position: 0 calc(var(--ruled-step) * 2 - 5px);
		background-repeat: no-repeat;
	}

	.report-title {
		grid-column: 1;
		grid-row: 1 / 3;
		align-self: center;
		font-family: var(--font-oswald);
		font-size: calc(var(--fs-xs) * 2);
		font-weight: 700;
		letter-spacing: 0.12em;
		color: #222;
		line-height: calc(var(--ruled-step) * 2);
		transform: translateY(-3px);
	}

	.report-id {
		grid-column: 2;
		grid-row: 2;
		align-self: end;
		color: #666;
		line-height: var(--ruled-step);
		transform: translateY(-3px);
	}

	.report-field {
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 0 0.5rem;
		margin: 0;
		min-height: var(--ruled-step);
	}

	.report-field--meta .field-value {
		margin-right: 0.35rem;
	}

	.report-field .field-label {
		font-weight: bold;
		color: #555;
		min-width: 110px;
		flex-shrink: 0;
		line-height: var(--ruled-step);
	}

	.report-field .field-value {
		color: #222;
		line-height: var(--ruled-step);
	}

	.version-badge {
		display: inline-flex;
		align-items: center;
		align-self: center;
		font-family: var(--font-source-code-pro);
		font-size: calc(var(--fs-xs) * 0.88);
		line-height: 1;
		color: #444;
		background: #f0f0f0;
		padding: 0.2rem 0.55rem;
		border: 1px solid #d4d4d4;
		border-radius: 3px;
		box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
		transform: translateY(-1px);
	}

	.meta-sep {
		color: #aaa;
		margin: 0 0.35rem;
	}

	.cms-edit-link {
		color: #8b0000;
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		font-size: calc(var(--fs-xs) * 0.85);

		&:hover {
			text-decoration: underline;
		}
	}

	.project-tech-tags {
		display: inline-flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 0.35rem;
		line-height: var(--ruled-step);
	}

	.project-tech-tag {
		display: inline-block;
		font-size: calc(var(--fs-xs) * 0.85);
		padding: 0.05rem 0.35rem;
		background-color: #e5e3db;
		color: #555;
		font-style: italic;
		line-height: calc(var(--ruled-step) - 6px);
		vertical-align: baseline;
	}

	.report-body {
		margin-top: var(--ruled-step);
		padding-top: 0;
		min-height: calc(var(--ruled-step) * 2);

		.field-label {
			font-weight: bold;
			color: #555;
			display: block;
			line-height: var(--ruled-step);
			margin: 0;
		}

		p {
			margin: 0;
			color: #333;
			line-height: var(--ruled-step);
			padding-left: 0.5rem;
			border-left: 2px solid #999;
		}

		.report-content {
			padding-left: 0.5rem;
			border-left: 2px solid #999;
			color: #333;
			line-height: var(--ruled-step);
		}

		.report-content :global(p) {
			margin: 0;
			line-height: var(--ruled-step);
		}

		.report-content :global(p + p) {
			margin-top: 0;
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
			&:hover {
				background: #1a1e22;
			}
		}
		&.website,
		&.live {
			background: #0066cc;
			color: #fff;
			&:hover {
				background: #0055aa;
			}
		}
		&.custom {
			background: #666;
			color: #fff;
			&:hover {
				background: #555;
			}
		}
		&.npm {
			background: #cb3837;
			color: #fff;
			&:hover {
				background: #b52e2e;
			}
		}
		&.docs {
			background: #5c4d7d;
			color: #fff;
			&:hover {
				background: #4a3d66;
			}
		}
		&.demo {
			background: #2e7d32;
			color: #fff;
			&:hover {
				background: #256428;
			}
		}
	}

	@media (max-width: 900px) {
		.filing-cabinet {
			grid-template-columns: 1fr;
		}
	}
</style>
