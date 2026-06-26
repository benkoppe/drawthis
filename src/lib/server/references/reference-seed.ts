import type {
	ReferenceOrientation,
	ReferencePracticeFocus,
	ReferenceSceneType,
	ReferenceSeedMetadata,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from '$lib/references';

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

export function makeReferenceSeedMetadata(seed: ReferenceSearchSeed): ReferenceSeedMetadata {
	return {
		id: seed.id,
		label: seed.label,
		query: seed.query
	};
}
