import { isReferenceCategory, type ReferenceFeedRequest } from '$lib/references';
import { getReferenceFeed } from '$lib/server/references/feed';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const maxRecentReferenceIds = 50;

function parseReferenceFeedRequest(body: unknown): ReferenceFeedRequest {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) {
		return {};
	}

	const input = body as Record<string, unknown>;
	const request: ReferenceFeedRequest = {};

	if (input.count !== undefined) {
		if (typeof input.count !== 'number' || !Number.isInteger(input.count)) {
			throw error(400, 'count must be an integer');
		}

		request.count = input.count;
	}

	if (input.category !== undefined) {
		if (!isReferenceCategory(input.category)) {
			throw error(400, 'category is not supported');
		}

		request.category = input.category;
	}

	if (input.recentReferenceIds !== undefined) {
		if (
			!Array.isArray(input.recentReferenceIds) ||
			!input.recentReferenceIds.every((id) => typeof id === 'string')
		) {
			throw error(400, 'recentReferenceIds must be an array of strings');
		}

		request.recentReferenceIds = input.recentReferenceIds.slice(-maxRecentReferenceIds);
	}

	return request;
}

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;

	try {
		body = await request.json();
	} catch {
		body = {};
	}

	try {
		return json(await getReferenceFeed(parseReferenceFeedRequest(body)));
	} catch (cause) {
		if (cause instanceof Error && cause.message.startsWith('count must be')) {
			throw error(400, cause.message);
		}

		throw cause;
	}
};
