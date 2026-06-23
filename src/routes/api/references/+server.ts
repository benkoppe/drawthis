import { mergeRecentReferenceIds } from '$lib/references';
import { readOrCreateReferenceFeedSeedCookie } from '$lib/server/references/feed-seed-cookie';
import { createReferenceSearchCache } from '$lib/server/references/cache';
import { parseReferenceFeedRequest } from '$lib/server/references/feed-request';
import { getReferenceFeed } from '$lib/server/references/feed';
import {
	readRecentReferenceIdsCookie,
	writeRecentReferenceIdsCookie
} from '$lib/server/references/history-cookie';
import { createSeededRandom } from '$lib/server/references/seeded-random';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, platform, request }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		body = {};
	}

	try {
		const feedSeed = readOrCreateReferenceFeedSeedCookie(cookies);
		const parsedRequest = parseReferenceFeedRequest(body);
		const recentReferenceIds = mergeRecentReferenceIds(
			readRecentReferenceIdsCookie(cookies),
			parsedRequest.recentReferenceIds ?? [],
			parsedRequest.currentReferenceId ? [parsedRequest.currentReferenceId] : []
		);
		const random = createSeededRandom(
			`next:${feedSeed}:${parsedRequest.currentReferenceId ?? ''}:${recentReferenceIds.join('\0')}`
		);
		const feed = await getReferenceFeed(
			{ ...parsedRequest, recentReferenceIds },
			{ random, searchCache: createReferenceSearchCache(platform) }
		);
		const updatedRecentReferenceIds = mergeRecentReferenceIds(
			recentReferenceIds,
			feed.references.map((reference) => reference.id)
		);

		writeRecentReferenceIdsCookie(cookies, updatedRecentReferenceIds);

		return json(feed);
	} catch (cause) {
		if (cause instanceof Error && cause.message.startsWith('count must be')) {
			throw error(400, cause.message);
		}

		throw cause;
	}
};
