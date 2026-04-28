/**
 * Open-Meteo current forecast (no API key; browser-safe with CORS).
 * @see https://open-meteo.com/en/docs
 */

type OpenMeteoCurrentResponse = {
	current?: {
		temperature_2m: number;
		weather_code: number;
	};
};

/** WMO Weather interpretation codes (WW) — same table Open-Meteo uses. */
export function wmoCodeToShortLabel(code: number): string {
	const map: Record<number, string> = {
		0: 'Clear',
		1: 'Mostly clear',
		2: 'Partly cloudy',
		3: 'Overcast',
		45: 'Fog',
		48: 'Fog',
		51: 'Light drizzle',
		53: 'Drizzle',
		55: 'Heavy drizzle',
		56: 'Freezing drizzle',
		57: 'Freezing drizzle',
		61: 'Light rain',
		63: 'Rain',
		65: 'Heavy rain',
		66: 'Freezing rain',
		67: 'Freezing rain',
		71: 'Light snow',
		73: 'Snow',
		75: 'Heavy snow',
		77: 'Snow grains',
		80: 'Rain showers',
		81: 'Rain showers',
		82: 'Violent rain',
		85: 'Snow showers',
		86: 'Heavy snow showers',
		95: 'Thunderstorm',
		96: 'Thunderstorm',
		99: 'Thunderstorm'
	};
	return map[code] ?? 'Unknown';
}

export type LocalWeatherOptions = {
	/** Abort when the component unmounts or navigation cancels the request. */
	signal?: AbortSignal;
	/** Matches the date line in Newspaper (en-US). */
	temperatureUnit?: 'fahrenheit' | 'celsius';
};

/**
 * Returns a short line like `72°F · Partly cloudy` for the given coordinates.
 */
export async function fetchLocalWeatherSummary(
	latitude: number,
	longitude: number,
	options: LocalWeatherOptions = {}
): Promise<string> {
	const { signal, temperatureUnit = 'fahrenheit' } = options;
	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', String(latitude));
	url.searchParams.set('longitude', String(longitude));
	url.searchParams.set('current', 'temperature_2m,weather_code');
	url.searchParams.set('temperature_unit', temperatureUnit);

	const res = await fetch(url, { signal });
	if (!res.ok) {
		throw new Error(`Weather request failed: ${res.status}`);
	}
	const data = (await res.json()) as OpenMeteoCurrentResponse;
	const current = data.current;
	if (!current) {
		throw new Error('No current weather in response');
	}
	const temp = Math.round(current.temperature_2m);
	const unit = temperatureUnit === 'fahrenheit' ? '°F' : '°C';
	const label = wmoCodeToShortLabel(current.weather_code);
	return `${temp}${unit} · ${label}`;
}
