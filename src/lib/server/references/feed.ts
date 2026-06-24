import {
	defaultReferenceFeedCount,
	maxReferenceFeedCount,
	providerReferenceSearchPageSize,
	type ReferenceFeedRequest,
	type ReferenceFeedResponse
} from '$lib/references';
import { collectReferenceCandidates, type ReferenceAvoidancePolicy } from './candidate-collector';
import type { ReferenceSearchCache } from './cache';
import { createReferenceFeedPlan } from './feed-planner';
import type { ReferenceFeedPolicy } from './feed-policy';
import { sequenceReferenceCandidates } from './feed-sequencer';
import type { ReferenceProvider } from './provider';
import { createReferenceProviders } from './providers';

export interface ReferenceFeedOptions {
	providers?: readonly ReferenceProvider[];
	policy?: ReferenceFeedPolicy;
	random?: () => number;
	searchCache?: ReferenceSearchCache;
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

	for (const reference of request.precedingReferences ?? []) {
		hardReferenceIds.add(reference.id);
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

export async function getReferenceFeed(
	request: ReferenceFeedRequest = {},
	options: ReferenceFeedOptions = {}
): Promise<ReferenceFeedResponse> {
	const count = getRequestedCount(request.count);
	const providers = options.providers ?? createReferenceProviders();
	const avoidancePolicy = getAvoidancePolicy(request);
	const plan = createReferenceFeedPlan(request, {
		providers,
		policy: options.policy,
		random: options.random,
		searchCount: getProviderSearchCount(count)
	});
	const candidates = await collectReferenceCandidates(
		plan.searches,
		count,
		avoidancePolicy,
		options.searchCache
	);

	return {
		references: sequenceReferenceCandidates(candidates, {
			count,
			precedingReferences: request.precedingReferences,
			recentReferences: request.recentReferences
		})
	};
}
