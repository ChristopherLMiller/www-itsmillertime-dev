import type { Config } from './lib/types/payload-types';

declare module 'payload' {
	export interface GeneratedTypes extends Config {}
}
