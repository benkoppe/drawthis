import type {
	ReferenceOrientation,
	ReferencePracticeFocus,
	ReferenceProviderId,
	ReferenceSceneType,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from '$lib/references';
import { defaultReferenceSearchSeeds } from './reference-seed-catalog';

export const referenceSeedCoverageTags = [
	'animal-detail',
	'animal-motion',
	'architecture',
	'body-parts',
	'clutter',
	'construction-practice',
	'desk',
	'everyday-object',
	'expression',
	'fabric',
	'feet',
	'food',
	'gesture',
	'groups',
	'hands',
	'interior',
	'kitchen',
	'landscape',
	'material-study',
	'mechanical-detail',
	'mundane',
	'negative-space',
	'organic-form',
	'perspective-practice',
	'plant',
	'portrait',
	'public-space',
	'still-life',
	'storefront',
	'street',
	'texture-study',
	'transit',
	'vehicle',
	'water'
] as const;

export type ReferenceSeedCoverageTag = (typeof referenceSeedCoverageTags)[number];

export interface ReferenceSearchSeed {
	id: string;
	label: string;
	query: string;
	primarySubject: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	secondarySubjects?: readonly ReferenceSubjectId[];
	sceneTypes?: readonly ReferenceSceneType[];
	focuses?: readonly ReferencePracticeFocus[];
	complexity?: ReferenceVisualComplexity;
	weight?: number;
	orientation?: ReferenceOrientation;
	coverageTags?: readonly ReferenceSeedCoverageTag[];
}

export interface ReferenceProviderPaginationPolicy {
	initialCursorPageMin: number;
	initialCursorPageMax: number;
}

export interface ReferenceFeedPolicy {
	seeds: readonly ReferenceSearchSeed[];
	providerWeights?: Readonly<Partial<Record<ReferenceProviderId, number>>>;
	providerPagination?: Readonly<
		Partial<Record<ReferenceProviderId, ReferenceProviderPaginationPolicy>>
	>;
	maxSearchAttemptsPerFeed?: number;
}

export const defaultReferenceFeedPolicy: ReferenceFeedPolicy = {
	maxSearchAttemptsPerFeed: 24,
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
