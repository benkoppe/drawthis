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

export interface CollectReferenceCandidatesOptions {
	searches: readonly PlannedProviderSearch[];
	count: number;
	avoidancePolicy: ReferenceAvoidancePolicy;
	searchCache?: ReferenceSearchCache;
	maxProviderSearchAttempts?: number;
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

function referenceMatchesPlannedSearch(
	reference: DrawingReference,
	search: PlannedProviderSearch
): boolean {
	return (
		reference.taxonomy.primarySubject === search.seed.primarySubject &&
		(search.seed.topic === undefined || reference.taxonomy.topic === search.seed.topic)
	);
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
	return new Set(searches.map((search) => search.seed.primarySubject)).size;
}

export async function collectReferenceCandidates({
	searches,
	count,
	avoidancePolicy,
	searchCache,
	maxProviderSearchAttempts = Number.POSITIVE_INFINITY
}: CollectReferenceCandidatesOptions): Promise<ReferenceCandidate[]> {
	const candidatesByReferenceId = new Map<string, ReferenceCandidate>();
	const plannedSubjectCount = getPlannedSubjectCount(searches);
	const providerFailures: ReferenceProviderFailureAttempt[] = [];
	const failedProviderIds = new Set<string>();
	let searchAttemptCount = 0;
	let order = 0;

	for (const search of searches) {
		let result: ProviderSearchResult;

		if (searchAttemptCount >= maxProviderSearchAttempts) {
			break;
		}

		if (failedProviderIds.has(search.provider.id)) {
			continue;
		}

		searchAttemptCount += 1;

		try {
			result = await searchReferenceProvider(search.provider, search.request, searchCache);
		} catch (cause) {
			console.warn(`Reference provider "${search.provider.id}" failed`, cause);
			failedProviderIds.add(search.provider.id);
			providerFailures.push({
				providerId: search.provider.id,
				providerName: search.provider.name,
				cause
			});
			continue;
		}

		for (const reference of result.references) {
			if (
				candidatesByReferenceId.has(reference.id) ||
				!referenceMatchesPlannedSearch(reference, search)
			) {
				continue;
			}

			const seed = reference.selection?.seed ?? search.request.seed;
			const referenceWithSelectionContext = {
				...reference,
				...(seed === undefined ? {} : { selection: { ...reference.selection, seed } })
			};

			candidatesByReferenceId.set(reference.id, {
				reference: referenceWithSelectionContext,
				rank: getReferenceSelectionRank(referenceWithSelectionContext, avoidancePolicy),
				order,
				seed: search.request.seed
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
