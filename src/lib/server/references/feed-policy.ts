import type {
	ReferenceProviderId,
	ReferenceSceneType,
	ReferenceVisualComplexity
} from '$lib/references';
import { defaultReferenceSearchSeeds } from './reference-seeds';
import type { ReferenceSearchSeed, ReferenceSeedCoverageTag } from './reference-seed';

export interface ReferenceProviderPaginationPolicy {
	initialCursorPageMin: number;
	initialCursorPageMax: number;
}

export interface ReferenceCandidateCollectionPolicy {
	minimumSearchAttempts?: number;
	minimumUniqueSubjectCount?: number;
	minimumUniqueSeedCount?: number;
	minimumUniqueTopicCount?: number;
	targetPreferredCandidateMultiplier?: number;
	minimumPreferredCandidateCount?: number;
}

export interface ReferenceSeedWeightPolicy {
	coverageTagMultipliers?: Readonly<Partial<Record<ReferenceSeedCoverageTag, number>>>;
	complexityMultipliers?: Readonly<Partial<Record<ReferenceVisualComplexity, number>>>;
	sceneTypeMultipliers?: Readonly<Partial<Record<ReferenceSceneType, number>>>;
}

export interface ReferenceFeedPolicy {
	seeds: readonly ReferenceSearchSeed[];
	providerWeights?: Readonly<Partial<Record<ReferenceProviderId, number>>>;
	providerPagination?: Readonly<
		Partial<Record<ReferenceProviderId, ReferenceProviderPaginationPolicy>>
	>;
	candidateCollection?: ReferenceCandidateCollectionPolicy;
	seedWeights?: ReferenceSeedWeightPolicy;
	maxProviderSearchAttempts?: number;
}

export const defaultReferenceFeedPolicy: ReferenceFeedPolicy = {
	maxProviderSearchAttempts: 24,
	candidateCollection: {
		minimumSearchAttempts: 2,
		minimumUniqueSubjectCount: 3,
		minimumUniqueSeedCount: 2,
		minimumUniqueTopicCount: 2,
		targetPreferredCandidateMultiplier: 2,
		minimumPreferredCandidateCount: 4
	},
	providerWeights: {
		pexels: 4,
		openverse: 2,
		local: 0.5
	},
	seedWeights: {
		coverageTagMultipliers: {
			mundane: 1.35,
			'everyday-object': 1.2,
			interior: 1.1,
			street: 1.1,
			'public-space': 1.08,
			desk: 1.08,
			clutter: 1.08
		},
		complexityMultipliers: {
			simple: 1.05,
			moderate: 1.2,
			complex: 1,
			dense: 0.8
		},
		sceneTypeMultipliers: {
			'everyday-life': 1.25,
			interior: 1.08,
			street: 1.08,
			'public-space': 1.05,
			workplace: 1.05,
			'still-life': 1.03
		}
	},
	providerPagination: {
		pexels: {
			initialCursorPageMin: 1,
			initialCursorPageMax: 10
		},
		openverse: {
			initialCursorPageMin: 1,
			initialCursorPageMax: 5
		}
	},
	seeds: defaultReferenceSearchSeeds
};
