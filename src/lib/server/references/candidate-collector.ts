import type { DrawingReference } from '$lib/references';
import { searchReferenceProvider } from './cached-provider';
import type { ReferenceSearchCache } from './cache';
import {
	createReferenceFeedUnavailableError,
	type ReferenceProviderFailureAttempt
} from './feed-error';
import type { PlannedProviderSearch } from './feed-planner';
import type { ReferenceCandidateCollectionPolicy } from './feed-policy';
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
	candidateCollectionPolicy?: ReferenceCandidateCollectionPolicy;
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

interface PreferredCandidateCoverage {
	candidateCount: number;
	subjects: ReadonlySet<string>;
	topics: ReadonlySet<string>;
	seeds: ReadonlySet<string>;
}

function getPreferredCandidateCoverage(
	candidates: Iterable<ReferenceCandidate>
): PreferredCandidateCoverage {
	let candidateCount = 0;
	const subjects = new Set<string>();
	const topics = new Set<string>();
	const seeds = new Set<string>();

	for (const candidate of candidates) {
		if (candidate.rank !== referenceSelectionRanks.preferred) {
			continue;
		}

		candidateCount += 1;
		subjects.add(candidate.reference.taxonomy.primarySubject);
		if (candidate.reference.taxonomy.topic !== undefined) {
			topics.add(candidate.reference.taxonomy.topic);
		}

		const seedId = candidate.reference.selection?.seed?.id ?? candidate.seed?.id;

		if (seedId !== undefined) {
			seeds.add(seedId);
		}
	}

	return { candidateCount, subjects, topics, seeds };
}

function getPlannedSubjectCount(searches: readonly PlannedProviderSearch[]): number {
	return new Set(searches.map((search) => search.seed.primarySubject)).size;
}

function getPlannedTopicCount(searches: readonly PlannedProviderSearch[]): number {
	return new Set(
		searches.flatMap((search) => (search.seed.topic === undefined ? [] : [search.seed.topic]))
	).size;
}

function getPlannedSeedCount(searches: readonly PlannedProviderSearch[]): number {
	return new Set(searches.map((search) => search.seed.id)).size;
}

function getMinimumSearchAttempts(
	searches: readonly PlannedProviderSearch[],
	count: number,
	policy: ReferenceCandidateCollectionPolicy | undefined
): number {
	if (searches.length === 0) {
		return 0;
	}

	const seedCoverageFloor = Math.min(
		getPlannedSeedCount(searches),
		policy?.minimumUniqueSeedCount ?? Math.min(count + 1, 2)
	);

	return Math.min(searches.length, Math.max(policy?.minimumSearchAttempts ?? 1, seedCoverageFloor));
}

function hasEnoughPreferredCoverage(
	candidates: Iterable<ReferenceCandidate>,
	searches: readonly PlannedProviderSearch[],
	count: number,
	searchAttemptCount: number,
	policy: ReferenceCandidateCollectionPolicy | undefined
): boolean {
	const coverage = getPreferredCandidateCoverage(candidates);
	const plannedSubjectCount = getPlannedSubjectCount(searches);
	const plannedTopicCount = getPlannedTopicCount(searches);
	const plannedSeedCount = getPlannedSeedCount(searches);
	const targetCandidateCount = Math.max(
		count,
		policy?.minimumPreferredCandidateCount ?? count,
		count * (policy?.targetPreferredCandidateMultiplier ?? 1)
	);
	const targetSubjectCount = Math.min(
		plannedSubjectCount,
		Math.max(1, Math.min(policy?.minimumUniqueSubjectCount ?? count, count))
	);
	const targetTopicCount = Math.min(
		plannedTopicCount,
		Math.max(1, Math.min(policy?.minimumUniqueTopicCount ?? count, count + 2))
	);
	const targetSeedCount = Math.min(
		plannedSeedCount,
		Math.max(1, Math.min(policy?.minimumUniqueSeedCount ?? count, count + 3))
	);

	return (
		searchAttemptCount >= getMinimumSearchAttempts(searches, count, policy) &&
		coverage.candidateCount >= targetCandidateCount &&
		coverage.subjects.size >= targetSubjectCount &&
		(plannedTopicCount === 0 || coverage.topics.size >= targetTopicCount) &&
		(plannedSeedCount === 0 || coverage.seeds.size >= targetSeedCount)
	);
}

export async function collectReferenceCandidates({
	searches,
	count,
	avoidancePolicy,
	searchCache,
	maxProviderSearchAttempts = Number.POSITIVE_INFINITY,
	candidateCollectionPolicy
}: CollectReferenceCandidatesOptions): Promise<ReferenceCandidate[]> {
	const candidatesByReferenceId = new Map<string, ReferenceCandidate>();
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
			hasEnoughPreferredCoverage(
				candidatesByReferenceId.values(),
				searches,
				count,
				searchAttemptCount,
				candidateCollectionPolicy
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
