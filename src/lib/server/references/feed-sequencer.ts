import type {
	DrawingReference,
	ReferenceFeedContextItem,
	ReferencePracticeFocus,
	ReferenceProviderId,
	ReferenceSceneType,
	ReferenceSeedMetadata,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from '$lib/references';

export const referenceSelectionRanks = {
	preferred: 0,
	softFallback: 1,
	hardFallback: 2
} as const;

export type ReferenceSelectionRank =
	(typeof referenceSelectionRanks)[keyof typeof referenceSelectionRanks];

export interface ReferenceCandidate {
	reference: DrawingReference;
	rank: ReferenceSelectionRank;
	order: number;
	seed?: ReferenceSeedMetadata;
}

export interface SequenceReferencesOptions {
	count: number;
	precedingReferences?: readonly ReferenceFeedContextItem[];
	recentReferences?: readonly ReferenceFeedContextItem[];
}

interface CandidateScore {
	rank: ReferenceSelectionRank;
	samePreviousSubjectPenalty: number;
	recentSubjectPenalty: number;
	samePreviousTopicPenalty: number;
	recentTopicPenalty: number;
	samePreviousSeedPenalty: number;
	recentSceneTypePenalty: number;
	recentPracticeFocusPenalty: number;
	recentComplexityPenalty: number;
	samePreviousProviderPenalty: number;
	order: number;
}

type SequencingContextItem = ReferenceFeedContextItem | ReferenceCandidate;

const samePreviousSubjectPenalty = 1_000;
const recentSubjectUnitPenalty = 100;
const samePreviousTopicPenalty = 350;
const recentTopicUnitPenalty = 75;
const samePreviousSeedPenalty = 300;
const recentSceneTypeUnitPenalty = 20;
const recentPracticeFocusUnitPenalty = 12;
const recentComplexityUnitPenalty = 8;
const samePreviousProviderPenalty = 5;
const recentContextWindowSize = 12;

function compareScores(left: CandidateScore, right: CandidateScore): number {
	return (
		left.rank - right.rank ||
		left.samePreviousSubjectPenalty - right.samePreviousSubjectPenalty ||
		left.samePreviousTopicPenalty - right.samePreviousTopicPenalty ||
		left.samePreviousSeedPenalty - right.samePreviousSeedPenalty ||
		left.recentSubjectPenalty - right.recentSubjectPenalty ||
		left.recentTopicPenalty - right.recentTopicPenalty ||
		left.recentSceneTypePenalty - right.recentSceneTypePenalty ||
		left.recentPracticeFocusPenalty - right.recentPracticeFocusPenalty ||
		left.recentComplexityPenalty - right.recentComplexityPenalty ||
		left.samePreviousProviderPenalty - right.samePreviousProviderPenalty ||
		left.order - right.order
	);
}

function isReferenceCandidate(reference: SequencingContextItem): reference is ReferenceCandidate {
	return 'reference' in reference;
}

function getPrimarySubject(reference: SequencingContextItem): ReferenceSubjectId {
	return isReferenceCandidate(reference)
		? reference.reference.taxonomy.primarySubject
		: reference.taxonomy.primarySubject;
}

function getTopic(reference: SequencingContextItem): ReferenceTopicId | undefined {
	return isReferenceCandidate(reference)
		? reference.reference.taxonomy.topic
		: reference.taxonomy.topic;
}

function getProviderId(reference: SequencingContextItem): ReferenceProviderId | undefined {
	return isReferenceCandidate(reference) ? reference.reference.provider.id : reference.providerId;
}

function getSeedId(reference: SequencingContextItem): string | undefined {
	return isReferenceCandidate(reference)
		? reference.reference.selection?.seed?.id
		: reference.selection?.seedId;
}

function getSceneTypes(reference: SequencingContextItem): readonly ReferenceSceneType[] {
	return isReferenceCandidate(reference)
		? (reference.reference.training?.sceneTypes ?? [])
		: (reference.training?.sceneTypes ?? []);
}

function getPracticeFocuses(reference: SequencingContextItem): readonly ReferencePracticeFocus[] {
	return isReferenceCandidate(reference)
		? (reference.reference.training?.focuses ?? [])
		: (reference.training?.focuses ?? []);
}

function countRecentSubjectUses(
	subject: ReferenceSubjectId,
	context: readonly SequencingContextItem[]
): number {
	return context
		.slice(-recentContextWindowSize)
		.reduce((count, reference) => count + (getPrimarySubject(reference) === subject ? 1 : 0), 0);
}

function countRecentTopicUses(
	topic: ReferenceTopicId | undefined,
	context: readonly SequencingContextItem[]
): number {
	if (topic === undefined) {
		return 0;
	}

	return context
		.slice(-recentContextWindowSize)
		.reduce((count, reference) => count + (getTopic(reference) === topic ? 1 : 0), 0);
}

function countRecentOverlap<T>(
	values: readonly T[],
	context: readonly SequencingContextItem[],
	getValues: (reference: SequencingContextItem) => readonly T[]
): number {
	if (values.length === 0) {
		return 0;
	}

	const valueSet = new Set(values);

	return context.slice(-recentContextWindowSize).reduce((count, reference) => {
		const overlapCount = getValues(reference).filter((value) => valueSet.has(value)).length;

		return count + overlapCount;
	}, 0);
}

function getComplexity(reference: SequencingContextItem): ReferenceVisualComplexity | undefined {
	return isReferenceCandidate(reference)
		? reference.reference.training?.complexity
		: reference.training?.complexity;
}

function countRecentComplexityUses(
	complexity: ReferenceVisualComplexity | undefined,
	context: readonly SequencingContextItem[]
): number {
	if (complexity === undefined) {
		return 0;
	}

	return context
		.slice(-recentContextWindowSize)
		.reduce((count, reference) => count + (getComplexity(reference) === complexity ? 1 : 0), 0);
}

function scoreCandidate(
	candidate: ReferenceCandidate,
	context: readonly SequencingContextItem[]
): CandidateScore {
	const previousReference = context.at(-1);
	const candidateSubject = candidate.reference.taxonomy.primarySubject;
	const candidateTopic = candidate.reference.taxonomy.topic;
	const candidateProviderId = candidate.reference.provider.id;
	const candidateSeedId = candidate.reference.selection?.seed?.id ?? candidate.seed?.id;
	const previousProviderId = previousReference ? getProviderId(previousReference) : undefined;
	const previousSeedId = previousReference ? getSeedId(previousReference) : undefined;
	const previousTopic = previousReference ? getTopic(previousReference) : undefined;

	return {
		rank: candidate.rank,
		samePreviousSubjectPenalty:
			previousReference && getPrimarySubject(previousReference) === candidateSubject
				? samePreviousSubjectPenalty
				: 0,
		recentSubjectPenalty:
			countRecentSubjectUses(candidateSubject, context) * recentSubjectUnitPenalty,
		samePreviousTopicPenalty:
			candidateTopic !== undefined && candidateTopic === previousTopic
				? samePreviousTopicPenalty
				: 0,
		recentTopicPenalty: countRecentTopicUses(candidateTopic, context) * recentTopicUnitPenalty,
		samePreviousSeedPenalty:
			candidateSeedId !== undefined && candidateSeedId === previousSeedId
				? samePreviousSeedPenalty
				: 0,
		recentSceneTypePenalty:
			countRecentOverlap(candidate.reference.training?.sceneTypes ?? [], context, getSceneTypes) *
			recentSceneTypeUnitPenalty,
		recentPracticeFocusPenalty:
			countRecentOverlap(candidate.reference.training?.focuses ?? [], context, getPracticeFocuses) *
			recentPracticeFocusUnitPenalty,
		recentComplexityPenalty:
			countRecentComplexityUses(candidate.reference.training?.complexity, context) *
			recentComplexityUnitPenalty,
		samePreviousProviderPenalty:
			previousProviderId === candidateProviderId ? samePreviousProviderPenalty : 0,
		order: candidate.order
	};
}

export function sequenceReferenceCandidates(
	candidates: Iterable<ReferenceCandidate>,
	options: SequenceReferencesOptions
): DrawingReference[] {
	const remainingCandidates = [...candidates];
	const selectedCandidates: ReferenceCandidate[] = [];
	const selectedReferenceIds = new Set<string>();
	const initialContext = [
		...(options.recentReferences ?? []),
		...(options.precedingReferences ?? [])
	];

	while (selectedCandidates.length < options.count && remainingCandidates.length > 0) {
		const context = [...initialContext, ...selectedCandidates];
		let bestCandidateIndex = -1;
		let bestScore: CandidateScore | undefined;

		for (const [index, candidate] of remainingCandidates.entries()) {
			if (selectedReferenceIds.has(candidate.reference.id)) {
				continue;
			}

			const score = scoreCandidate(candidate, context);

			if (bestScore === undefined || compareScores(score, bestScore) < 0) {
				bestCandidateIndex = index;
				bestScore = score;
			}
		}

		if (bestCandidateIndex === -1) {
			break;
		}

		const [selectedCandidate] = remainingCandidates.splice(bestCandidateIndex, 1);
		selectedReferenceIds.add(selectedCandidate.reference.id);
		selectedCandidates.push(selectedCandidate);
	}

	return selectedCandidates.map((candidate) => candidate.reference);
}
