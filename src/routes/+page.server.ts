import {
	initialReferenceFeedCount,
	mergeRecentReferenceContexts,
	mergeRecentReferenceIds,
	toReferenceFeedContextItem
} from '$lib/references';
import { readOrCreateReferenceFeedSeedCookie } from '$lib/server/references/feed-seed-cookie';
import { createReferenceSearchCache } from '$lib/server/references/cache';
import { getReferenceFeed } from '$lib/server/references/feed';
import { isReferenceFeedUnavailableError } from '$lib/server/references/feed-error';
import {
	readRecentReferenceContextsCookie,
	readRecentReferenceIdsCookie,
	writeRecentReferenceContextsCookie,
	writeRecentReferenceIdsCookie
} from '$lib/server/references/history-cookie';
import { createSeededRandom } from '$lib/server/references/seeded-random';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, platform }) => {
	const feedSeed = readOrCreateReferenceFeedSeedCookie(cookies);
	const recentReferenceContexts = readRecentReferenceContextsCookie(cookies);
	const recentReferenceIds = mergeRecentReferenceIds(
		readRecentReferenceIdsCookie(cookies),
		recentReferenceContexts.map((reference) => reference.id)
	);
	const random = createSeededRandom(`initial:${feedSeed}:${recentReferenceIds.join('\0')}`);
	const feed = await getReferenceFeed(
		{
			count: initialReferenceFeedCount,
			recentReferenceIds,
			recentReferences: recentReferenceContexts
		},
		{ random, searchCache: createReferenceSearchCache(platform) }
	).catch((cause: unknown) => {
		if (isReferenceFeedUnavailableError(cause)) {
			throw error(503, cause.message);
		}

		throw cause;
	});
	const feedReferenceContexts = feed.references.map(toReferenceFeedContextItem);
	const updatedRecentReferenceIds = mergeRecentReferenceIds(
		recentReferenceIds,
		feed.references.map((reference) => reference.id)
	);
	const updatedRecentReferenceContexts = mergeRecentReferenceContexts(
		recentReferenceContexts,
		feedReferenceContexts
	);

	writeRecentReferenceIdsCookie(cookies, updatedRecentReferenceIds);
	writeRecentReferenceContextsCookie(cookies, updatedRecentReferenceContexts);

	return {
		...feed,
		recentReferenceIds: updatedRecentReferenceIds,
		recentReferences: updatedRecentReferenceContexts
	};
};
