/**
 * Entry for `$lib/payload`. Vite resolves this file before the `payload/` directory.
 * `./payload/sdk` avoids `./payload` resolving back to this file (`payload.ts`).
 */
export * from './payload/sdk';
