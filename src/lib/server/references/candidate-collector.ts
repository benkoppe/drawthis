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

function hasEnoughPreferredSubjectCoverage(
	candidates: Iterable<ReferenceCandidate>,
	count: number,
	plannedSubjectCount: number
): boolean {
	let preferredCandidateCount = 0;
	const preferredSubjects = new Set<string>();

	for (const candidate of candidates) {
		if (candidate.rank !== referenceSelectionRanks.preferred) {
			continue;
		}

		preferredCandidateCount += 1;
		preferredSubjects.add(candidate.reference.taxonomy.primarySubject);
	}

	return (
		preferredCandidateCount >= count &&
		preferredSubjects.size >= Math.min(count, plannedSubjectCount)
	);
}

function getPlannedSubjectCount(searches: readonly PlannedProviderSearch[]): number {
	return new Set(searches.map((search) => search.primarySubject)).size;
}

export async function collectReferenceCandidates(
	searches: readonly PlannedProviderSearch[],
	count: number,
	avoidancePolicy: ReferenceAvoidancePolicy,
	searchCache: ReferenceSearchCache | undefined
): Promise<ReferenceCandidate[]> {
	const candidatesByReferenceId = new Map<string, ReferenceCandidate>();
	const plannedSubjectCount = getPlannedSubjectCount(searches);
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

			const referenceWithSelectionContext = {
				...reference,
				selection: { ...reference.selection, seedId: reference.selection?.seedId ?? search.seed.id }
			};

			candidatesByReferenceId.set(reference.id, {
				reference: referenceWithSelectionContext,
				rank: getReferenceSelectionRank(referenceWithSelectionContext, avoidancePolicy),
				order,
				seedId: search.seed.id
			});
			order += 1;
		}

		if (
			hasEnoughPreferredSubjectCoverage(
				candidatesByReferenceId.values(),
				count,
				plannedSubjectCount
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
