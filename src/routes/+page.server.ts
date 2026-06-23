import { mergeRecentReferenceIds } from '$lib/references';
import { readOrCreateReferenceFeedSeedCookie } from '$lib/server/references/feed-seed-cookie';
import { getReferenceFeed } from '$lib/server/references/feed';
import {
	readRecentReferenceIdsCookie,
	writeRecentReferenceIdsCookie
} from '$lib/server/references/history-cookie';
import { createSeededRandom } from '$lib/server/references/seeded-random';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const feedSeed = readOrCreateReferenceFeedSeedCookie(cookies);
	const recentReferenceIds = readRecentReferenceIdsCookie(cookies);
	const random = createSeededRandom(`initial:${feedSeed}:${recentReferenceIds.join('\0')}`);
	const feed = await getReferenceFeed({ count: 1, recentReferenceIds }, { random });
	const updatedRecentReferenceIds = mergeRecentReferenceIds(
		recentReferenceIds,
		feed.references.map((reference) => reference.id)
	);

	writeRecentReferenceIdsCookie(cookies, updatedRecentReferenceIds);

	return {
		...feed,
		recentReferenceIds: updatedRecentReferenceIds
	};
};
