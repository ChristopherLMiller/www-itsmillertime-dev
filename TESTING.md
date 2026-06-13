# Testing

This project uses **Vitest** for automated tests.

## Commands

| Command               | What it does                                                                   |
| --------------------- | ------------------------------------------------------------------------------ |
| `pnpm test`           | Run all unit tests once (CI-friendly).                                         |
| `pnpm test:watch`     | Re-run tests when files change.                                                |
| `pnpm test:coverage`  | Unit tests + HTML coverage report in `coverage/` (open `coverage/index.html`). |
| `pnpm test:storybook` | Run Storybook’s browser tests (Playwright); slower, optional locally.          |

## What to test first

1. **Pure functions** in `src/lib/utils/` — no DOM, no network (or mock `fetch` when testing thin wrappers). Easiest wins: add `foo.test.ts` next to `foo.ts` inside each util folder.
2. **API route handlers** — optional later: call the exported `GET`/`POST` with mocked `Request` and `env` (more setup).
3. **Svelte components** — optional: use `@testing-library/svelte` + `jsdom`; or rely on **Storybook** for visual/manual checks.

## Minimal test file

Create `src/lib/utils/myHelper/myHelper.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { myHelper } from './myHelper';

describe('myHelper', () => {
	it('does the expected thing', () => {
		expect(myHelper('input')).toBe('output');
	});
});
```

Run `pnpm test`. Vitest picks up any `src/**/*.test.ts` (see `vitest.config.ts`).

## Tips

- **One behavior per `it` block** — when a test fails, the name tells you what broke.
- **Name the file** `*.test.ts` next to the module you test, under `src/lib/utils/<name>/`.
- **`describe` groups** related cases (edge cases, happy path).
- Use **`expect(x).toThrow()`** for functions that should error.

For coverage, prefer testing **your logic** (formatters, parsers) over third-party libraries.
