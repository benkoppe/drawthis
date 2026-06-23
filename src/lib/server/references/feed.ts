import {
	defaultReferenceFeedCount,
	maxReferenceFeedCount,
	type ReferenceFeedRequest,
	type ReferenceFeedResponse
} from '$lib/references';
import type { ReferenceProvider } from './provider';
import { referenceProviders } from './providers';

export interface ReferenceFeedOptions {
	providers?: readonly ReferenceProvider[];
}

function getRequestedCount(count: ReferenceFeedRequest['count']): number {
	if (count === undefined) {
		return defaultReferenceFeedCount;
	}

	if (!Number.isInteger(count) || count < 1 || count > maxReferenceFeedCount) {
		throw new Error(`count must be an integer between 1 and ${maxReferenceFeedCount}`);
	}

	return count;
}

function providerSupportsRequest(
	provider: ReferenceProvider,
	request: ReferenceFeedRequest
): boolean {
	return (
		request.category === undefined || provider.capabilities.categories.includes(request.category)
	);
}

function withoutRecentReferences(
	references: ReferenceFeedResponse['references'],
	recentReferenceIds: readonly string[]
): ReferenceFeedResponse['references'] {
	if (recentReferenceIds.length === 0) {
		return references;
	}

	const recentIds = new Set(recentReferenceIds);

	return references.filter((reference) => !recentIds.has(reference.id));
}

async function searchProvider(
	provider: ReferenceProvider,
	request: ReferenceFeedRequest,
	count: number,
	recentReferenceIds: readonly string[]
): Promise<ReferenceFeedResponse['references']> {
	const searchCount = Math.min(
		maxReferenceFeedCount + recentReferenceIds.length,
		count + recentReferenceIds.length
	);
	const result = await provider.search({
		count: searchCount,
		category: request.category
	});

	return withoutRecentReferences(result.references, recentReferenceIds).slice(0, count);
}

export async function getReferenceFeed(
	request: ReferenceFeedRequest = {},
	options: ReferenceFeedOptions = {}
): Promise<ReferenceFeedResponse> {
	const count = getRequestedCount(request.count);
	const providers = options.providers ?? referenceProviders;
	const recentReferenceIds = request.recentReferenceIds ?? [];
	const compatibleProviders = providers.filter((provider) =>
		providerSupportsRequest(provider, request)
	);

	for (const provider of compatibleProviders) {
		const references = await searchProvider(provider, request, count, recentReferenceIds);

		if (references.length > 0) {
			return { references };
		}
	}

	for (const provider of compatibleProviders) {
		const result = await provider.search({ count, category: request.category });

		if (result.references.length > 0) {
			return { references: result.references.slice(0, count) };
		}
	}

	return { references: [] };
}
