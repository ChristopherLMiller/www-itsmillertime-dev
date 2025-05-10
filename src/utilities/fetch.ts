import { dev } from '$app/environment';
import { env } from '$env/dynamic/public';
import { error } from '@sveltejs/kit';
import * as qs from 'qs-esm';
import type { StrapiResponse } from '../types/StrapiResponse';

interface iFetchFromStrapi {
	path: string;
	queryParams?: unknown;
}

export async function FetchFromStrapi<T>({ path, queryParams }: iFetchFromStrapi) {
	try {
		const url = `${env.PUBLIC_STRAPI_API_ENDPOINT}/${path}?${qs.stringify(queryParams)}`;

		if (dev) {
			console.info(`Fetching from Strapi: ${url}`);
		}

		const response = await fetch(url);

		if (response.ok) {
			const data = await response.json();

			if (data satisfies StrapiResponse<T>) {
				return data;
			}

			throw error(response.status, 'Unable to fetch data from strapi');
		}
	} catch (fetchError) {
		console.error(fetchError);
		throw error(fetchError.status, fetchError.body.message);
	}
}
