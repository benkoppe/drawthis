import type {
	DrawingReference,
	ReferenceFeedContextItem,
	ReferenceSeedMetadata
} from '$lib/references';
import {
	countRecentFacetOverlap,
	countRecentFacetUses,
	createReferenceDiversityFacetsFromContext,
	createReferenceDiversityFacetsFromReference,
	referenceDiversityContextWindowSize,
	type ReferenceDiversityFacets
} from './reference-diversity';

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
	recentSeedPenalty: number;
	recentSceneTypePenalty: number;
	recentPracticeFocusPenalty: number;
	recentComplexityPenalty: number;
	samePreviousProviderPenalty: number;
	recentProviderPenalty: number;
	order: number;
}

type SequencingContextItem = ReferenceFeedContextItem | ReferenceCandidate;

const samePreviousSubjectPenalty = 1_000;
const recentSubjectUnitPenalty = 100;
const samePreviousTopicPenalty = 350;
const recentTopicUnitPenalty = 75;
const samePreviousSeedPenalty = 300;
const recentSeedUnitPenalty = 90;
const recentSceneTypeUnitPenalty = 20;
const recentPracticeFocusUnitPenalty = 12;
const recentComplexityUnitPenalty = 8;
const samePreviousProviderPenalty = 80;
const recentProviderUnitPenalty = 24;
const recentContextWindowSize = referenceDiversityContextWindowSize;

function compareScores(left: CandidateScore, right: CandidateScore): number {
	return (
		left.rank - right.rank ||
		left.samePreviousSubjectPenalty - right.samePreviousSubjectPenalty ||
		left.samePreviousTopicPenalty - right.samePreviousTopicPenalty ||
		left.samePreviousSeedPenalty - right.samePreviousSeedPenalty ||
		left.recentSubjectPenalty - right.recentSubjectPenalty ||
		left.recentTopicPenalty - right.recentTopicPenalty ||
		left.recentSeedPenalty - right.recentSeedPenalty ||
		left.recentSceneTypePenalty - right.recentSceneTypePenalty ||
		left.recentPracticeFocusPenalty - right.recentPracticeFocusPenalty ||
		left.recentComplexityPenalty - right.recentComplexityPenalty ||
		left.samePreviousProviderPenalty - right.samePreviousProviderPenalty ||
		left.recentProviderPenalty - right.recentProviderPenalty ||
		left.order - right.order
	);
}

function isReferenceCandidate(reference: SequencingContextItem): reference is ReferenceCandidate {
	return 'reference' in reference;
}

function createSequencingFacets(reference: SequencingContextItem): ReferenceDiversityFacets {
	if (!isReferenceCandidate(reference)) {
		return createReferenceDiversityFacetsFromContext(reference);
	}

	const facets = createReferenceDiversityFacetsFromReference(reference.reference);

	return {
		...facets,
		seedId: facets.seedId ?? reference.seed?.id
	};
}

function getRecentContextFacets(
	context: readonly SequencingContextItem[]
): ReferenceDiversityFacets[] {
	return context.slice(-recentContextWindowSize).map(createSequencingFacets);
}

function scoreCandidate(
	candidate: ReferenceCandidate,
	context: readonly SequencingContextItem[]
): CandidateScore {
	const recentFacets = getRecentContextFacets(context);
	const previousFacets = recentFacets.at(-1);
	const candidateFacets = createSequencingFacets(candidate);

	return {
		rank: candidate.rank,
		samePreviousSubjectPenalty:
			candidateFacets.subject === previousFacets?.subject ? samePreviousSubjectPenalty : 0,
		recentSubjectPenalty:
			countRecentFacetUses(candidateFacets.subject, recentFacets, (facets) => facets.subject) *
			recentSubjectUnitPenalty,
		samePreviousTopicPenalty:
			candidateFacets.topic !== undefined && candidateFacets.topic === previousFacets?.topic
				? samePreviousTopicPenalty
				: 0,
		recentTopicPenalty:
			countRecentFacetUses(candidateFacets.topic, recentFacets, (facets) => facets.topic) *
			recentTopicUnitPenalty,
		samePreviousSeedPenalty:
			candidateFacets.seedId !== undefined && candidateFacets.seedId === previousFacets?.seedId
				? samePreviousSeedPenalty
				: 0,
		recentSeedPenalty:
			countRecentFacetUses(candidateFacets.seedId, recentFacets, (facets) => facets.seedId) *
			recentSeedUnitPenalty,
		recentSceneTypePenalty:
			countRecentFacetOverlap(
				candidateFacets.sceneTypes,
				recentFacets,
				(facets) => facets.sceneTypes
			) * recentSceneTypeUnitPenalty,
		recentPracticeFocusPenalty:
			countRecentFacetOverlap(candidateFacets.focuses, recentFacets, (facets) => facets.focuses) *
			recentPracticeFocusUnitPenalty,
		recentComplexityPenalty:
			countRecentFacetUses(
				candidateFacets.complexity,
				recentFacets,
				(facets) => facets.complexity
			) * recentComplexityUnitPenalty,
		samePreviousProviderPenalty:
			candidateFacets.providerId === previousFacets?.providerId ? samePreviousProviderPenalty : 0,
		recentProviderPenalty:
			countRecentFacetUses(
				candidateFacets.providerId,
				recentFacets,
				(facets) => facets.providerId
			) * recentProviderUnitPenalty,
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
