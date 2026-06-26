import type {
	ReferenceFeedContextItem,
	ReferenceSubjectId,
	ReferenceTopicId
} from '$lib/references';
import {
	countRecentFacetOverlap,
	countRecentFacetUses,
	createReferenceDiversityFacetsFromSeed,
	getRecentReferenceDiversityFacets,
	referenceDiversityContextWindowSize,
	type ReferenceDiversityFacets
} from './reference-diversity';
import type { ReferenceSearchSeed } from './reference-seed';

export const planningContextWindowSize = referenceDiversityContextWindowSize;

const samePreviousSubjectPenalty = 1_000;
const recentSubjectUnitPenalty = 100;
const samePreviousTopicPenalty = 450;
const recentTopicUnitPenalty = 80;
const samePreviousSeedPenalty = 350;
const recentSeedUnitPenalty = 125;
const recentSceneTypeUnitPenalty = 20;
const recentPracticeFocusUnitPenalty = 12;
const recentComplexityUnitPenalty = 8;

export interface ReferencePlanningContextSource {
	recentReferences?: readonly ReferenceFeedContextItem[];
	precedingReferences?: readonly ReferenceFeedContextItem[];
}

export function createReferencePlanningContext(
	source: ReferencePlanningContextSource
): ReferenceFeedContextItem[] {
	return [...(source.recentReferences ?? []), ...(source.precedingReferences ?? [])].slice(
		-planningContextWindowSize
	);
}

function getRecentContextFacets(
	context: readonly ReferenceFeedContextItem[]
): ReferenceDiversityFacets[] {
	return getRecentReferenceDiversityFacets(context, planningContextWindowSize);
}

function getPreviousContextFacets(
	context: readonly ReferenceFeedContextItem[]
): ReferenceDiversityFacets | undefined {
	const [previous] = getRecentContextFacets(context).slice(-1);

	return previous;
}

export function getSubjectPlanningScore(
	subject: ReferenceSubjectId,
	context: readonly ReferenceFeedContextItem[]
): number {
	const recentFacets = getRecentContextFacets(context);
	const previousFacets = recentFacets.at(-1);

	return (
		(previousFacets?.subject === subject ? samePreviousSubjectPenalty : 0) +
		countRecentFacetUses(subject, recentFacets, (facets) => facets.subject) *
			recentSubjectUnitPenalty
	);
}

export function getTopicPlanningScore(
	topic: ReferenceTopicId | undefined,
	context: readonly ReferenceFeedContextItem[]
): number {
	const recentFacets = getRecentContextFacets(context);
	const previousFacets = recentFacets.at(-1);

	return (
		(topic !== undefined && previousFacets?.topic === topic ? samePreviousTopicPenalty : 0) +
		countRecentFacetUses(topic, recentFacets, (facets) => facets.topic) * recentTopicUnitPenalty
	);
}

export function getSeedPlanningScore(
	seed: ReferenceSearchSeed,
	context: readonly ReferenceFeedContextItem[]
): number {
	const recentFacets = getRecentContextFacets(context);
	const previousFacets = getPreviousContextFacets(context);
	const seedFacets = createReferenceDiversityFacetsFromSeed(seed);

	return (
		(seedFacets.seedId === previousFacets?.seedId ? samePreviousSeedPenalty : 0) +
		countRecentFacetUses(seedFacets.seedId, recentFacets, (facets) => facets.seedId) *
			recentSeedUnitPenalty +
		countRecentFacetOverlap(seedFacets.sceneTypes, recentFacets, (facets) => facets.sceneTypes) *
			recentSceneTypeUnitPenalty +
		countRecentFacetOverlap(seedFacets.focuses, recentFacets, (facets) => facets.focuses) *
			recentPracticeFocusUnitPenalty +
		countRecentFacetUses(seedFacets.complexity, recentFacets, (facets) => facets.complexity) *
			recentComplexityUnitPenalty
	);
}
