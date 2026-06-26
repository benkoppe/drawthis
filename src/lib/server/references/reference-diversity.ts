import type {
	DrawingReference,
	ReferenceFeedContextItem,
	ReferencePracticeFocus,
	ReferenceProviderId,
	ReferenceSceneType,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from '$lib/references';
import type { ReferenceSeedCoverageTag, ReferenceSearchSeed } from './reference-seed';

export const referenceDiversityContextWindowSize = 12;

export interface ReferenceDiversityFacets {
	subject?: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	seedId?: string;
	providerId?: ReferenceProviderId;
	sceneTypes: readonly ReferenceSceneType[];
	focuses: readonly ReferencePracticeFocus[];
	complexity?: ReferenceVisualComplexity;
	coverageTags: readonly ReferenceSeedCoverageTag[];
}

export function createReferenceDiversityFacetsFromContext(
	reference: ReferenceFeedContextItem
): ReferenceDiversityFacets {
	return {
		subject: reference.taxonomy.primarySubject,
		topic: reference.taxonomy.topic,
		providerId: reference.providerId,
		seedId: reference.selection?.seedId,
		sceneTypes: reference.training?.sceneTypes ?? [],
		focuses: reference.training?.focuses ?? [],
		complexity: reference.training?.complexity,
		coverageTags: []
	};
}

export function createReferenceDiversityFacetsFromReference(
	reference: DrawingReference
): ReferenceDiversityFacets {
	return {
		subject: reference.taxonomy.primarySubject,
		topic: reference.taxonomy.topic,
		providerId: reference.provider.id,
		seedId: reference.selection?.seed?.id,
		sceneTypes: reference.training?.sceneTypes ?? [],
		focuses: reference.training?.focuses ?? [],
		complexity: reference.training?.complexity,
		coverageTags: []
	};
}

export function createReferenceDiversityFacetsFromSeed(
	seed: ReferenceSearchSeed
): ReferenceDiversityFacets {
	return {
		subject: seed.primarySubject,
		topic: seed.topic,
		seedId: seed.id,
		sceneTypes: seed.sceneTypes ?? [],
		focuses: seed.focuses ?? [],
		complexity: seed.complexity,
		coverageTags: seed.coverageTags ?? []
	};
}

export function getRecentReferenceDiversityFacets(
	context: readonly ReferenceFeedContextItem[],
	windowSize = referenceDiversityContextWindowSize
): ReferenceDiversityFacets[] {
	return context.slice(-windowSize).map(createReferenceDiversityFacetsFromContext);
}

export function countRecentFacetUses<T>(
	value: T | undefined,
	context: readonly ReferenceDiversityFacets[],
	getValue: (facets: ReferenceDiversityFacets) => T | undefined
): number {
	if (value === undefined) {
		return 0;
	}

	return context.reduce((count, facets) => count + (getValue(facets) === value ? 1 : 0), 0);
}

export function countRecentFacetOverlap<T>(
	values: readonly T[],
	context: readonly ReferenceDiversityFacets[],
	getValues: (facets: ReferenceDiversityFacets) => readonly T[]
): number {
	if (values.length === 0) {
		return 0;
	}

	const valueSet = new Set(values);

	return context.reduce((count, facets) => {
		const overlapCount = getValues(facets).filter((value) => valueSet.has(value)).length;

		return count + overlapCount;
	}, 0);
}
