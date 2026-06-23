import type { ReferenceFeedRequest, ReferenceFeedResponse } from './types';

export interface RequestReferenceFeedOptions {
	fetch: typeof fetch;
	basePath?: string;
}

export async function requestReferenceFeed(
	request: ReferenceFeedRequest,
	options: RequestReferenceFeedOptions
): Promise<ReferenceFeedResponse> {
	const response = await options.fetch(`${options.basePath ?? ''}/api/references`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		throw new Error('Could not load the next reference.');
	}

	return (await response.json()) as ReferenceFeedResponse;
}
