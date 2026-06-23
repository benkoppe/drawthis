import {
	defaultReferenceFeedCount,
	maxReferenceFeedCount,
	providerReferenceSearchPageSize,
	type DrawingReference,
	type ReferenceFeedRequest,
	type ReferenceFeedResponse
} from '$lib/references';
import { searchReferenceProvider } from './cached-provider';
import type { ReferenceSearchCache } from './cache';
import { createReferenceFeedPlan, type PlannedProviderSearch } from './feed-planner';
import type { ReferenceFeedPolicy } from './feed-policy';
import type { ProviderSearchResult, ReferenceProvider } from './provider';
import { referenceProviders } from './providers';

export interface ReferenceFeedOptions {
	providers?: readonly ReferenceProvider[];
	policy?: ReferenceFeedPolicy;
	random?: () => number;
	searchCache?: ReferenceSearchCache;
}

interface ReferenceAvoidancePolicy {
	hardReferenceIds: ReadonlySet<string>;
	softReferenceIds: ReadonlySet<string>;
}

const referenceSelectionRanks = {
	preferred: 0,
	softFallback: 1,
	hardFallback: 2
} as const;

type ReferenceSelectionRank =
	(typeof referenceSelectionRanks)[keyof typeof referenceSelectionRanks];

interface RankedReference {
	reference: DrawingReference;
	rank: ReferenceSelectionRank;
	order: number;
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

function getProviderSearchCount(count: number): number {
	return Math.max(count, providerReferenceSearchPageSize);
}

function getReferenceSelectionRank(
	reference: DrawingReference,
	avoidancePolicy: ReferenceAvoidancePolicy
): ReferenceSelectionRank {
	if (avoidancePolicy.hardReferenceIds.has(reference.id)) {
		return referenceSelectionRanks.hardFallback;
	}

	if (avoidancePolicy.softReferenceIds.has(reference.id)) {
		return referenceSelectionRanks.softFallback;
	}

	return referenceSelectionRanks.preferred;
}

function selectRankedReferences(
	rankedReferences: Iterable<RankedReference>,
	count: number
): DrawingReference[] {
	return [...rankedReferences]
		.sort((left, right) => left.rank - right.rank || left.order - right.order)
		.slice(0, count)
		.map(({ reference }) => reference);
}

async function searchForReferences(
	searches: readonly PlannedProviderSearch[],
	count: number,
	avoidancePolicy: ReferenceAvoidancePolicy,
	searchCache: ReferenceSearchCache | undefined
): Promise<DrawingReference[]> {
	const rankedReferences = new Map<string, RankedReference>();
	let preferredReferenceCount = 0;
	let order = 0;

	for (const search of searches) {
		let result: ProviderSearchResult;

		try {
			result = await searchReferenceProvider(search.provider, search.request, searchCache);
		} catch (cause) {
			console.warn(`Reference provider "${search.provider.id}" failed`, cause);
			continue;
		}

		for (const reference of result.references) {
			if (rankedReferences.has(reference.id)) {
				continue;
			}

			const rank = getReferenceSelectionRank(reference, avoidancePolicy);

			if (rank === referenceSelectionRanks.preferred) {
				preferredReferenceCount += 1;
			}

			rankedReferences.set(reference.id, { reference, rank, order });
			order += 1;
		}

		if (preferredReferenceCount >= count) {
			return selectRankedReferences(rankedReferences.values(), count);
		}
	}

	return selectRankedReferences(rankedReferences.values(), count);
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
		searchCount: getProviderSearchCount(count)
	});

	return {
		references: await searchForReferences(
			plan.searches,
			count,
			avoidancePolicy,
			options.searchCache
		)
	};
}
