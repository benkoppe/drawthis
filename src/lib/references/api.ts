import type { ReferenceFeedRequest, ReferenceFeedResponse } from './types';

export interface RequestReferenceFeedOptions {
	fetch: typeof fetch;
	basePath?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function getReferenceFeedErrorMessage(response: Response): Promise<string> {
	try {
		const body: unknown = await response.json();

		if (isRecord(body) && typeof body.message === 'string' && body.message.trim().length > 0) {
			return body.message;
		}
	} catch {
		// Ignore unparseable error responses and use the stable fallback below.
	}

	return 'Could not load the next reference.';
}

export async function requestReferenceFeed(
	request: ReferenceFeedRequest,
	options: RequestReferenceFeedOptions
): Promise<ReferenceFeedResponse> {
	const response = await options.fetch(`${options.basePath ?? ''}/api/references`, {
		method: 'POST',
		headers: { accept: 'application/json', 'content-type': 'application/json' },
		body: JSON.stringify(request)
	});

	if (!response.ok) {
		throw new Error(await getReferenceFeedErrorMessage(response));
	}

	return (await response.json()) as ReferenceFeedResponse;
}
