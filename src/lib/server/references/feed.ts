import {
	defaultReferenceFeedCount,
	maxReferenceFeedCount,
	type DrawingReference,
	type ReferenceFeedRequest,
	type ReferenceFeedResponse
} from '$lib/references';
import { createReferenceFeedPlan, type PlannedProviderSearch } from './feed-planner';
import type { ReferenceFeedPolicy } from './feed-policy';
import type { ReferenceProvider } from './provider';
import { referenceProviders } from './providers';

export interface ReferenceFeedOptions {
	providers?: readonly ReferenceProvider[];
	policy?: ReferenceFeedPolicy;
	random?: () => number;
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

function getProviderSearchCount(count: number, recentReferenceIds: readonly string[]): number {
	return Math.min(
		maxReferenceFeedCount + recentReferenceIds.length,
		count + recentReferenceIds.length
	);
}

function withoutExcludedReferences(
	references: readonly DrawingReference[],
	excludedReferenceIds: ReadonlySet<string>
): DrawingReference[] {
	if (excludedReferenceIds.size === 0) {
		return [...references];
	}

	return references.filter((reference) => !excludedReferenceIds.has(reference.id));
}

function appendUniqueReferences(
	selectedReferences: DrawingReference[],
	candidateReferences: readonly DrawingReference[],
	count: number
): void {
	const selectedReferenceIds = new Set(selectedReferences.map((reference) => reference.id));

	for (const reference of candidateReferences) {
		if (selectedReferenceIds.has(reference.id)) {
			continue;
		}

		selectedReferences.push(reference);
		selectedReferenceIds.add(reference.id);

		if (selectedReferences.length >= count) {
			return;
		}
	}
}

async function searchForReferences(
	searches: readonly PlannedProviderSearch[],
	count: number,
	excludedReferenceIds: ReadonlySet<string>,
	selectedReferences: DrawingReference[]
): Promise<void> {
	for (const search of searches) {
		const result = await search.provider.search(search.request);
		const freshReferences = withoutExcludedReferences(result.references, excludedReferenceIds);

		appendUniqueReferences(selectedReferences, freshReferences, count);

		if (selectedReferences.length >= count) {
			return;
		}
	}
}

export async function getReferenceFeed(
	request: ReferenceFeedRequest = {},
	options: ReferenceFeedOptions = {}
): Promise<ReferenceFeedResponse> {
	const count = getRequestedCount(request.count);
	const providers = options.providers ?? referenceProviders;
	const recentReferenceIds = request.recentReferenceIds ?? [];
	const plan = createReferenceFeedPlan(request, {
		providers,
		policy: options.policy,
		random: options.random,
		searchCount: getProviderSearchCount(count, recentReferenceIds)
	});
	const references: DrawingReference[] = [];

	await searchForReferences(plan.searches, count, new Set(recentReferenceIds), references);

	if (references.length < count) {
		await searchForReferences(plan.searches, count, new Set(), references);
	}

	return { references };
}
