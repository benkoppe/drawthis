import { parseReferenceFeedRequest } from '$lib/server/references/feed-request';
import { getReferenceFeed } from '$lib/server/references/feed';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

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
