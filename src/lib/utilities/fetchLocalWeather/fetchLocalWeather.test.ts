import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchLocalWeatherSummary, wmoCodeToShortLabel } from './fetchLocalWeather';

describe('wmoCodeToShortLabel', () => {
	it('maps known codes', () => {
		expect(wmoCodeToShortLabel(0)).toBe('Clear');
		expect(wmoCodeToShortLabel(3)).toBe('Overcast');
		expect(wmoCodeToShortLabel(95)).toBe('Thunderstorm');
	});

	it('returns Unknown for unrecognized codes', () => {
		expect(wmoCodeToShortLabel(99999)).toBe('Unknown');
	});
});

describe('fetchLocalWeatherSummary', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('formats temperature and label from JSON response (fahrenheit)', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				current: { temperature_2m: 22.4, weather_code: 2 }
			})
		});

		await expect(fetchLocalWeatherSummary(40.7, -74.0)).resolves.toBe('22°F · Partly cloudy');
		expect(fetch).toHaveBeenCalledWith(expect.any(URL), { signal: undefined });
		const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as URL;
		expect(calledUrl.hostname).toBe('api.open-meteo.com');
		expect(calledUrl.searchParams.get('latitude')).toBe('40.7');
		expect(calledUrl.searchParams.get('longitude')).toBe('-74');
	});

	it('uses celsius when requested', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				current: { temperature_2m: -5.2, weather_code: 71 }
			})
		});

		await expect(fetchLocalWeatherSummary(60, 10, { temperatureUnit: 'celsius' })).resolves.toBe(
			'-5°C · Light snow'
		);
	});

	it('throws when response is not ok', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: false,
			status: 503
		});

		await expect(fetchLocalWeatherSummary(0, 0)).rejects.toThrow('Weather request failed: 503');
	});

	it('throws when current weather is missing', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({})
		});

		await expect(fetchLocalWeatherSummary(0, 0)).rejects.toThrow('No current weather in response');
	});

	it('passes AbortSignal to fetch', async () => {
		const controller = new AbortController();
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				current: { temperature_2m: 0, weather_code: 0 }
			})
		});

		await fetchLocalWeatherSummary(1, 2, { signal: controller.signal });
		expect(fetch).toHaveBeenCalledWith(expect.any(URL), { signal: controller.signal });
	});
});
