# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is a SvelteKit-based website that integrates with a headless CMS (Payload CMS). The application fetches content from an external CMS API and displays it as articles, pages, and other content types. It includes a sophisticated caching layer using Upstash Redis and automated type generation from the CMS.

## Package Manager

This project uses **pnpm** as specified in package.json (`"packageManager": "pnpm@9.15.7"`). Always use pnpm commands:

```bash
pnpm install
pnpm run dev
pnpm run build
```

## Development Commands

### Essential Commands

- `pnpm run dev` - Start development server with automatic Payload type fetching
- `pnpm run build` - Create production build
- `pnpm run preview` - Preview production build locally

### Code Quality

- `pnpm run lint` - Run Prettier and ESLint checks
- `pnpm run format` - Format code with Prettier
- `pnpm run check` - Run Svelte type checking
- `pnpm run check:watch` - Run Svelte type checking in watch mode

### Type Generation Scripts

- `pnpm run fetch-payload-types` - Fetch TypeScript types from remote Payload CMS
- `pnpm run generate-zod-schema` - Generate Zod schemas from TypeScript types using Anthropic AI

## Architecture Overview

### Core Structure

- **Frontend**: SvelteKit 5 with TypeScript
- **Styling**: Custom CSS with Stylelint for validation
- **Content Source**: Payload CMS (external/headless)
- **Caching**: Client-side TanStack Query with an IndexedDB persister (stale-while-revalidate + offline)
- **Type Safety**: TypeScript with automated Zod schema generation

### Key Directories

- `src/routes/(site)/` - Main website routes using SvelteKit's group layout
- `src/routes/api/` - API routes that fetch Payload directly (no cache layer)
- `src/lib/queries/` - Data fetching functions for different content types
- `src/lib/query/` - TanStack Query client, IndexedDB persister, and query definitions
- `src/lib/cache/` - Server-side Payload fetchers + shared query/data types
- `src/lib/types/` - TypeScript type definitions (auto-generated from CMS)
- `src/lib/schemas/zod/` - Zod validation schemas (AI-generated from types)
- `scripts/` - Automation scripts for type syncing and schema generation

### Type System Workflow

1. **Payload CMS Types**: External CMS generates `payload-types.ts`
2. **Sync Script**: `sync-payload-types.ts` fetches types from GitHub and detects changes
3. **AI Generation**: Uses Anthropic Claude to convert TypeScript types to Zod schemas
4. **Validation**: All API responses validated with generated Zod schemas

### Caching Strategy

There is **no Redis / server cache**. Content is fetched directly from Payload and
cached in the browser with TanStack Query:

- **Client cache**: TanStack Query (`src/lib/query/client.ts`) with `staleTime` 5 min, `gcTime` 30 days.
- **Persistence / offline**: `PersistQueryClientProvider` + an IndexedDB async-storage persister (`src/lib/query/idbPersister.ts`) serialize the query cache so content is instant on revisit and available offline.
- **Stale-While-Revalidate**: cached content paints immediately, a background refetch runs when stale, and the view updates reactively if the data changed.
- **Query definitions**: `src/lib/query/queries.ts` (layout globals, articles list, article detail, projects).

### API Pattern

Same-origin SvelteKit endpoints (`/api/layout-data`, `/api/articles-data`, `/api/articles/[slug]`, `/api/projects-data`) fetch Payload directly through the server SDK (`src/lib/payload/sdk.server.ts`) and return JSON with no caching. The browser reaches them via TanStack Query.

## Environment Variables

Required environment variables:

- `PAYLOAD_TYPES_URL` - URL to fetch TypeScript types (defaults to GitHub)
- `PUBLIC_PAYLOAD_API_ENDPOINT` - Payload CMS API base URL
- `PAYLOAD_INTERNAL_URL` - Server-side Payload REST base URL (must include `/api`)
- `ANTHROPIC_API_KEY` - For AI-powered Zod schema generation
- `ANTHROPIC_MODEL` - AI model to use (defaults to claude-3-7-sonnet-latest)

## Common Development Patterns

### Adding New Content Types

1. Update CMS schema (external)
2. Run `pnpm run fetch-payload-types` to sync types
3. Create query function in `src/lib/queries/`
4. Add route handlers in `src/routes/`

### Working with Queries

Client data is fetched with TanStack Query. Define options in `src/lib/query/queries.ts`
and consume them in components:

```svelte
<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { projectsQueryOptions } from '$lib/query/queries';

	const query = createQuery(() => projectsQueryOptions(1, 50));
	const projects = $derived(query.data?.projects ?? []);
</script>
```

### Cache Management

- Cached content is stored per query key and persisted to IndexedDB.
- Admin dock → **Browser** tab inspects and clears the persisted offline cache.
- Adjust freshness via `staleTime` / `gcTime` in `src/lib/query/client.ts`.

## Code Style and Configuration

- **ESLint**: Configured for TypeScript and Svelte with Prettier integration
- **Stylelint**: Standard configuration with strict color value rules
- **TypeScript**: Strict mode enabled with SvelteKit types
- **Svelte 5**: Uses modern runes syntax

## Adapter Configuration

Currently configured with `@sveltejs/adapter-node` for Node.js deployment. The build outputs to `build/` directory.
