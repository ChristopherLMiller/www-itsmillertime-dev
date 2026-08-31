import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

import {
	SESSION_KEEPALIVE_INTERVAL_MS,
	refreshSessionCookie,
	startSessionKeepalive
} from './sessionKeepalive';

describe('sessionKeepalive', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
		vi.stubGlobal('document', {
			visibilityState: 'visible',
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		});
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it('refreshSessionCookie calls get-session with credentials', async () => {
		await refreshSessionCookie();
		expect(fetch).toHaveBeenCalledWith('/api/auth/get-session', {
			method: 'GET',
			credentials: 'include',
			cache: 'no-store'
		});
	});

	it('startSessionKeepalive pings on interval and cleans up', () => {
		const stop = startSessionKeepalive();
		expect(fetch).not.toHaveBeenCalled();

		vi.advanceTimersByTime(SESSION_KEEPALIVE_INTERVAL_MS);
		expect(fetch).toHaveBeenCalledTimes(1);

		stop();
		vi.advanceTimersByTime(SESSION_KEEPALIVE_INTERVAL_MS);
		expect(fetch).toHaveBeenCalledTimes(1);
	});
});
