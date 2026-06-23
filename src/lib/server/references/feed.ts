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

interface ReferenceAvoidancePolicy {
	hardReferenceIds: ReadonlySet<string>;
	softReferenceIds: ReadonlySet<string>;
}

interface ReferenceSearchBuckets {
	preferred: DrawingReference[];
	softFallback: DrawingReference[];
	hardFallback: DrawingReference[];
	collectedReferenceIds: Set<string>;
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

function getAvoidancePolicy(request: ReferenceFeedRequest): ReferenceAvoidancePolicy {
	const hardReferenceIds = new Set<string>();

	if (request.currentReferenceId !== undefined) {
		hardReferenceIds.add(request.currentReferenceId);
	}

	return {
		hardReferenceIds,
		softReferenceIds: new Set(
			(request.recentReferenceIds ?? []).filter((referenceId) => !hardReferenceIds.has(referenceId))
		)
	};
}

function getProviderSearchCount(count: number, avoidancePolicy: ReferenceAvoidancePolicy): number {
	const avoidedReferenceCount =
		avoidancePolicy.hardReferenceIds.size + avoidancePolicy.softReferenceIds.size;

	return Math.min(maxReferenceFeedCount + avoidedReferenceCount, count + avoidedReferenceCount);
}

function makeReferenceSearchBuckets(): ReferenceSearchBuckets {
	return {
		preferred: [],
		softFallback: [],
		hardFallback: [],
		collectedReferenceIds: new Set()
	};
}

function appendUniqueReference(
	references: DrawingReference[],
	reference: DrawingReference,
	collectedReferenceIds: Set<string>
): void {
	if (collectedReferenceIds.has(reference.id)) {
		return;
	}

	references.push(reference);
	collectedReferenceIds.add(reference.id);
}

function collectReference(
	buckets: ReferenceSearchBuckets,
	reference: DrawingReference,
	avoidancePolicy: ReferenceAvoidancePolicy
): void {
	if (avoidancePolicy.hardReferenceIds.has(reference.id)) {
		appendUniqueReference(buckets.hardFallback, reference, buckets.collectedReferenceIds);
		return;
	}

	if (avoidancePolicy.softReferenceIds.has(reference.id)) {
		appendUniqueReference(buckets.softFallback, reference, buckets.collectedReferenceIds);
		return;
	}

	appendUniqueReference(buckets.preferred, reference, buckets.collectedReferenceIds);
}

function takeReferences(
	buckets: Pick<ReferenceSearchBuckets, 'preferred' | 'softFallback' | 'hardFallback'>,
	count: number
): DrawingReference[] {
	return [...buckets.preferred, ...buckets.softFallback, ...buckets.hardFallback].slice(0, count);
}

async function searchForReferences(
	searches: readonly PlannedProviderSearch[],
	count: number,
	avoidancePolicy: ReferenceAvoidancePolicy
): Promise<DrawingReference[]> {
	const buckets = makeReferenceSearchBuckets();

	for (const search of searches) {
		const result = await search.provider.search(search.request);

		for (const reference of result.references) {
			collectReference(buckets, reference, avoidancePolicy);
		}

		if (buckets.preferred.length >= count) {
			return buckets.preferred.slice(0, count);
		}
	}

	return takeReferences(buckets, count);
}

export async function getReferenceFeed(
	request: ReferenceFeedRequest = {},
	options: ReferenceFeedOptions = {}
): Promise<ReferenceFeedResponse> {
	const count = getRequestedCount(request.count);
	const providers = options.providers ?? referenceProviders;
	const avoidancePolicy = getAvoidancePolicy(request);
	const plan = createReferenceFeedPlan(request, {
		providers,
		policy: options.policy,
		random: options.random,
		searchCount: getProviderSearchCount(count, avoidancePolicy)
	});

	return { references: await searchForReferences(plan.searches, count, avoidancePolicy) };
}
