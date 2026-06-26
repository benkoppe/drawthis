import type {
	ReferenceFeedContextItem,
	ReferencePracticeFocus,
	ReferenceSceneType,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from '$lib/references';
import type { ReferenceSearchSeed } from './reference-seed';

export const planningContextWindowSize = 12;

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

function getRecentContext(
	context: readonly ReferenceFeedContextItem[]
): readonly ReferenceFeedContextItem[] {
	return context.slice(-planningContextWindowSize);
}

function getPreviousContextItem(
	context: readonly ReferenceFeedContextItem[]
): ReferenceFeedContextItem | undefined {
	return context.at(-1);
}

function countRecentSubjects(
	subject: ReferenceSubjectId,
	context: readonly ReferenceFeedContextItem[]
): number {
	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.taxonomy.primarySubject === subject ? 1 : 0),
		0
	);
}

function countRecentTopics(
	topic: ReferenceTopicId | undefined,
	context: readonly ReferenceFeedContextItem[]
): number {
	if (topic === undefined) {
		return 0;
	}

	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.taxonomy.topic === topic ? 1 : 0),
		0
	);
}

function countRecentSeeds(seedId: string, context: readonly ReferenceFeedContextItem[]): number {
	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.selection?.seedId === seedId ? 1 : 0),
		0
	);
}

function countRecentOverlap<T>(
	values: readonly T[] | undefined,
	context: readonly ReferenceFeedContextItem[],
	getValues: (reference: ReferenceFeedContextItem) => readonly T[] | undefined
): number {
	if (values === undefined || values.length === 0) {
		return 0;
	}

	const valueSet = new Set(values);

	return getRecentContext(context).reduce((count, reference) => {
		const overlapCount = (getValues(reference) ?? []).filter((value) => valueSet.has(value)).length;

		return count + overlapCount;
	}, 0);
}

function countRecentComplexity(
	complexity: ReferenceVisualComplexity | undefined,
	context: readonly ReferenceFeedContextItem[]
): number {
	if (complexity === undefined) {
		return 0;
	}

	return getRecentContext(context).reduce(
		(count, reference) => count + (reference.training?.complexity === complexity ? 1 : 0),
		0
	);
}

export function getSubjectPlanningScore(
	subject: ReferenceSubjectId,
	context: readonly ReferenceFeedContextItem[]
): number {
	const previousReference = getPreviousContextItem(context);

	return (
		(previousReference?.taxonomy.primarySubject === subject ? samePreviousSubjectPenalty : 0) +
		countRecentSubjects(subject, context) * recentSubjectUnitPenalty
	);
}

export function getTopicPlanningScore(
	topic: ReferenceTopicId | undefined,
	context: readonly ReferenceFeedContextItem[]
): number {
	const previousReference = getPreviousContextItem(context);

	return (
		(topic !== undefined && previousReference?.taxonomy.topic === topic
			? samePreviousTopicPenalty
			: 0) +
		countRecentTopics(topic, context) * recentTopicUnitPenalty
	);
}

export function getSeedPlanningScore(
	seed: ReferenceSearchSeed,
	context: readonly ReferenceFeedContextItem[]
): number {
	const previousReference = getPreviousContextItem(context);
	const previousSeedId = previousReference?.selection?.seedId;

	return (
		(seed.id === previousSeedId ? samePreviousSeedPenalty : 0) +
		countRecentSeeds(seed.id, context) * recentSeedUnitPenalty +
		countRecentOverlap(
			seed.sceneTypes,
			context,
			(reference): readonly ReferenceSceneType[] | undefined => reference.training?.sceneTypes
		) *
			recentSceneTypeUnitPenalty +
		countRecentOverlap(
			seed.focuses,
			context,
			(reference): readonly ReferencePracticeFocus[] | undefined => reference.training?.focuses
		) *
			recentPracticeFocusUnitPenalty +
		countRecentComplexity(seed.complexity, context) * recentComplexityUnitPenalty
	);
}
