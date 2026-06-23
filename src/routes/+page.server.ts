import { mergeRecentReferenceIds } from '$lib/references';
import { getReferenceFeed } from '$lib/server/references/feed';
import {
	readRecentReferenceIdsCookie,
	writeRecentReferenceIdsCookie
} from '$lib/server/references/history-cookie';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const recentReferenceIds = readRecentReferenceIdsCookie(cookies);
	const feed = await getReferenceFeed({ count: 1, recentReferenceIds });
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
