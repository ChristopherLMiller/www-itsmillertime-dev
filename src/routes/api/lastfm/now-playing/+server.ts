import { env } from '$env/dynamic/private';
import { error, isHttpError, json } from '@sveltejs/kit';

type LastFmImage = {
	'#text': string;
	size: string;
};

type LastFmArtist = {
	name?: string;
	'#text'?: string;
};

type LastFmAlbum = {
	'#text'?: string;
};

type LastFmTrack = {
	name: string;
	artist: LastFmArtist | string;
	album?: LastFmAlbum;
	url: string;
	image?: LastFmImage[];
	'@attr'?: {
		nowplaying?: 'true' | 'false';
	};
};

type LastFmResponse = {
	recenttracks?: {
		track?: LastFmTrack | LastFmTrack[];
	};
};

type NowPlayingTrack = {
	name: string;
	artist: string;
	album: string | null;
	url: string;
	image: string | null;
};

type NowPlayingResponse = {
	isPlaying: boolean;
	track: NowPlayingTrack | null;
};

const CACHE_TTL_MS = 15000;
let cachedResponse: { payload: NowPlayingResponse; timestamp: number } | null = null;

function getArtistName(track: LastFmTrack): string {
	if (typeof track.artist === 'string') {
		return track.artist;
	}

	return track.artist?.name ?? track.artist?.['#text'] ?? 'Unknown artist';
}

function getAlbumName(track: LastFmTrack): string | null {
	const albumName = track.album?.['#text'];
	return albumName && albumName.trim().length > 0 ? albumName : null;
}

function getImageUrl(track: LastFmTrack): string | null {
	if (!track.image) return null;

	const preferredSizes = ['extralarge', 'large', 'medium', 'small'];
	for (const size of preferredSizes) {
		const match = track.image.find((image) => image.size === size && image['#text']);
		if (match) {
			return match['#text'];
		}
	}

	return track.image.find((image) => image['#text'])?.['#text'] ?? null;
}

function normalizeTrack(track: LastFmTrack | undefined): NowPlayingTrack | null {
	if (!track?.name || !track.url) {
		return null;
	}

	return {
		name: track.name,
		artist: getArtistName(track),
		album: getAlbumName(track),
		url: track.url,
		image: getImageUrl(track)
	};
}

export async function GET() {
	const { LASTFM_API_KEY, LASTFM_USERNAME } = env;
	if (!LASTFM_API_KEY || !LASTFM_USERNAME) {
		throw error(500, 'Last.fm credentials not configured');
	}

	const now = Date.now();
	if (cachedResponse && now - cachedResponse.timestamp < CACHE_TTL_MS) {
		return json(cachedResponse.payload, {
			headers: {
				'Cache-Control': 'no-store',
				'X-Cache': 'HIT'
			}
		});
	}

	try {
		const url = new URL('https://ws.audioscrobbler.com/2.0/');
		url.searchParams.set('method', 'user.getrecenttracks');
		url.searchParams.set('user', LASTFM_USERNAME);
		url.searchParams.set('api_key', LASTFM_API_KEY);
		url.searchParams.set('format', 'json');
		url.searchParams.set('limit', '1');

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw error(500, 'Failed to fetch Last.fm data');
		}

		const data: LastFmResponse = await response.json();
		const tracks = data?.recenttracks?.track;
		const trackList = Array.isArray(tracks) ? tracks : tracks ? [tracks] : [];
		const mostRecentTrack = trackList[0];
		const isPlaying = mostRecentTrack?.['@attr']?.nowplaying === 'true';
		const normalizedTrack = normalizeTrack(mostRecentTrack);

		const payload: NowPlayingResponse = {
			isPlaying,
			track: normalizedTrack
		};

		cachedResponse = { payload, timestamp: now };

		return json(payload, {
			headers: {
				'Cache-Control': 'no-store',
				'X-Cache': 'MISS'
			}
		});
	} catch (err) {
		if (isHttpError(err)) throw err;
		throw error(500, 'Failed to fetch Last.fm data');
	}
}
