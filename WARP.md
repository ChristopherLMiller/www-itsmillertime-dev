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
- **Caching**: Upstash Redis with stale-while-revalidate pattern
- **Type Safety**: TypeScript with automated Zod schema generation

### Key Directories
- `src/routes/(site)/` - Main website routes using SvelteKit's group layout
- `src/routes/api/` - API routes for proxying CMS data with caching
- `src/lib/queries/` - Data fetching functions for different content types
- `src/lib/cache/` - Caching infrastructure (Upstash Redis)
- `src/lib/types/` - TypeScript type definitions (auto-generated from CMS)
- `src/lib/schemas/zod/` - Zod validation schemas (AI-generated from types)
- `scripts/` - Automation scripts for type syncing and schema generation

### Type System Workflow

1. **Payload CMS Types**: External CMS generates `payload-types.ts`
2. **Sync Script**: `sync-payload-types.ts` fetches types from GitHub and detects changes
3. **AI Generation**: Uses Anthropic Claude to convert TypeScript types to Zod schemas
4. **Validation**: All API responses validated with generated Zod schemas

### Caching Strategy

- **Primary Cache**: Upstash Redis with configurable TTL (default: 1 hour)
- **Cache Key Format**: `payload:<endpoint>-<querystring>`
- **Stale-While-Revalidate**: Serves stale data immediately, refreshes in background after 5 minutes
- **Cache Controls**: Support for `cache=false` and `refresh=true` query parameters

### API Proxy Pattern

The `/api/payload` endpoint acts as a caching proxy to the external Payload CMS:
- Handles all CMS queries through unified interface
- Implements automatic background refresh for stale data
- Provides cache status headers (`X-Cache: HIT|MISS|REFRESHED`)

## Environment Variables

Required environment variables:
- `PAYLOAD_TYPES_URL` - URL to fetch TypeScript types (defaults to GitHub)
- `PUBLIC_PAYLOAD_API_ENDPOINT` - Payload CMS API base URL
- `UPSTASH_REDIS_REST_URL` - Upstash Redis REST URL
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis REST token
- `ANTHROPIC_API_KEY` - For AI-powered Zod schema generation
- `ANTHROPIC_MODEL` - AI model to use (defaults to claude-3-7-sonnet-latest)

## Common Development Patterns

### Adding New Content Types
1. Update CMS schema (external)
2. Run `pnpm run fetch-payload-types` to sync types
3. Create query function in `src/lib/queries/`
4. Add route handlers in `src/routes/`

### Working with Queries
All query functions follow the pattern:
```typescript
export const getContentType = async (fetch, params) => {
  const response = await fetch(`/api/payload?endpoint=content&${qs.stringify(params)}`);
  const data = PayloadResponseSchema(ContentSchema).parse(await response.json());
  return data;
};
```

### Cache Management
- Use `?refresh=true` to force cache refresh during development
- Use `?cache=false` to bypass caching entirely
- Cache keys automatically include all query parameters

## Code Style and Configuration

- **ESLint**: Configured for TypeScript and Svelte with Prettier integration
- **Stylelint**: Standard configuration with strict color value rules
- **TypeScript**: Strict mode enabled with SvelteKit types
- **Svelte 5**: Uses modern runes syntax

## Adapter Configuration

Currently configured with `@sveltejs/adapter-node` for Node.js deployment. The build outputs to `build/` directory.
