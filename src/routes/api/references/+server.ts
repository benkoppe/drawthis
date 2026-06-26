import {
	getReferenceSubjectSelectionKey,
	getReferenceTopicSelectionKey,
	mergeRecentReferenceContexts,
	mergeRecentReferenceIds,
	referenceSubjects,
	referenceTopics,
	toReferenceFeedContextItem
} from '$lib/references';
import { readOrCreateReferenceFeedSeedCookie } from '$lib/server/references/feed-seed-cookie';
import { createReferenceSearchCache } from '$lib/server/references/cache';
import { parseReferenceFeedRequest } from '$lib/server/references/feed-request';
import { getReferenceFeed } from '$lib/server/references/feed';
import { isReferenceFeedUnavailableError } from '$lib/server/references/feed-error';
import {
	readRecentReferenceContextsCookie,
	readRecentReferenceIdsCookie,
	writeRecentReferenceContextsCookie,
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
		const cookieReferenceContexts = readRecentReferenceContextsCookie(cookies);
		const recentReferenceContexts = mergeRecentReferenceContexts(
			cookieReferenceContexts,
			parsedRequest.recentReferences ?? []
		);
		const precedingReferenceIds = (parsedRequest.precedingReferences ?? []).map(
			(reference) => reference.id
		);
		const recentReferenceIds = mergeRecentReferenceIds(
			readRecentReferenceIdsCookie(cookies),
			recentReferenceContexts.map((reference) => reference.id),
			parsedRequest.recentReferenceIds ?? [],
			precedingReferenceIds,
			parsedRequest.currentReferenceId ? [parsedRequest.currentReferenceId] : []
		);
		const enabledSubjectKey = getReferenceSubjectSelectionKey(
			parsedRequest.preferences?.enabledSubjects ?? referenceSubjects
		);
		const enabledTopicKey = getReferenceTopicSelectionKey(
			parsedRequest.preferences?.enabledTopics ?? referenceTopics,
			parsedRequest.preferences?.enabledSubjects ?? referenceSubjects
		);
		const random = createSeededRandom(
			`next:${feedSeed}:${enabledSubjectKey}:${enabledTopicKey}:${parsedRequest.currentReferenceId ?? ''}:${recentReferenceIds.join('\0')}`
		);
		const feed = await getReferenceFeed(
			{ ...parsedRequest, recentReferenceIds, recentReferences: recentReferenceContexts },
			{ random, searchCache: createReferenceSearchCache(platform) }
		);
		const feedReferenceContexts = feed.references.map(toReferenceFeedContextItem);
		const updatedRecentReferenceIds = mergeRecentReferenceIds(
			recentReferenceIds,
			feed.references.map((reference) => reference.id)
		);
		const updatedRecentReferenceContexts = mergeRecentReferenceContexts(
			recentReferenceContexts,
			parsedRequest.precedingReferences ?? [],
			feedReferenceContexts
		);

		writeRecentReferenceIdsCookie(cookies, updatedRecentReferenceIds);
		writeRecentReferenceContextsCookie(cookies, updatedRecentReferenceContexts);

		return json(feed);
	} catch (cause) {
		if (cause instanceof Error && cause.message.startsWith('count must be')) {
			throw error(400, cause.message);
		}

		if (isReferenceFeedUnavailableError(cause)) {
			throw error(503, cause.message);
		}

		throw cause;
	}
};
