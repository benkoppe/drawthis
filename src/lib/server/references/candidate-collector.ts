import type { DrawingReference } from '$lib/references';
import { searchReferenceProvider } from './cached-provider';
import type { ReferenceSearchCache } from './cache';
import {
	createReferenceFeedUnavailableError,
	type ReferenceProviderFailureAttempt
} from './feed-error';
import type { PlannedProviderSearch } from './feed-planner';
import {
	referenceSelectionRanks,
	type ReferenceCandidate,
	type ReferenceSelectionRank
} from './feed-sequencer';
import type { ProviderSearchResult } from './provider';

export interface ReferenceAvoidancePolicy {
	hardReferenceIds: ReadonlySet<string>;
	softReferenceIds: ReadonlySet<string>;
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

function hasEnoughPreferredCategoryCoverage(
	candidates: Iterable<ReferenceCandidate>,
	count: number,
	plannedCategoryCount: number
): boolean {
	let preferredCandidateCount = 0;
	const preferredCategories = new Set<string>();

	for (const candidate of candidates) {
		if (candidate.rank !== referenceSelectionRanks.preferred) {
			continue;
		}

		preferredCandidateCount += 1;
		preferredCategories.add(candidate.reference.category);
	}

	return (
		preferredCandidateCount >= count &&
		preferredCategories.size >= Math.min(count, plannedCategoryCount)
	);
}

function getPlannedCategoryCount(searches: readonly PlannedProviderSearch[]): number {
	return new Set(searches.map((search) => search.category)).size;
}

export async function collectReferenceCandidates(
	searches: readonly PlannedProviderSearch[],
	count: number,
	avoidancePolicy: ReferenceAvoidancePolicy,
	searchCache: ReferenceSearchCache | undefined
): Promise<ReferenceCandidate[]> {
	const candidatesByReferenceId = new Map<string, ReferenceCandidate>();
	const plannedCategoryCount = getPlannedCategoryCount(searches);
	const providerFailures: ReferenceProviderFailureAttempt[] = [];
	let order = 0;

	for (const search of searches) {
		let result: ProviderSearchResult;

		try {
			result = await searchReferenceProvider(search.provider, search.request, searchCache);
		} catch (cause) {
			console.warn(`Reference provider "${search.provider.id}" failed`, cause);
			providerFailures.push({
				providerId: search.provider.id,
				providerName: search.provider.name,
				cause
			});
			continue;
		}

		for (const reference of result.references) {
			if (candidatesByReferenceId.has(reference.id)) {
				continue;
			}

			candidatesByReferenceId.set(reference.id, {
				reference,
				rank: getReferenceSelectionRank(reference, avoidancePolicy),
				order,
				seedId: search.seed.id
			});
			order += 1;
		}

		if (
			hasEnoughPreferredCategoryCoverage(
				candidatesByReferenceId.values(),
				count,
				plannedCategoryCount
			)
		) {
			break;
		}
	}

	if (candidatesByReferenceId.size === 0 && providerFailures.length > 0) {
		throw createReferenceFeedUnavailableError(providerFailures);
	}

	return [...candidatesByReferenceId.values()];
}
