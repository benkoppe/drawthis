import { mergeRecentReferenceIds } from '$lib/references';
import { parseReferenceFeedRequest } from '$lib/server/references/feed-request';
import { getReferenceFeed } from '$lib/server/references/feed';
import {
	readRecentReferenceIdsCookie,
	writeRecentReferenceIdsCookie
} from '$lib/server/references/history-cookie';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, request }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		body = {};
	}

	try {
		const parsedRequest = parseReferenceFeedRequest(body);
		const recentReferenceIds = mergeRecentReferenceIds(
			readRecentReferenceIdsCookie(cookies),
			parsedRequest.recentReferenceIds ?? [],
			parsedRequest.currentReferenceId ? [parsedRequest.currentReferenceId] : []
		);
		const feed = await getReferenceFeed({ ...parsedRequest, recentReferenceIds });
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
