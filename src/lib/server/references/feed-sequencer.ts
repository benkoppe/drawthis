import type {
	DrawingReference,
	ReferenceFeedContextItem,
	ReferenceProviderId
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
	seedId?: string;
}

export interface SequenceReferencesOptions {
	count: number;
	precedingReferences?: readonly ReferenceFeedContextItem[];
	recentReferences?: readonly ReferenceFeedContextItem[];
}

interface CandidateScore {
	rank: ReferenceSelectionRank;
	samePreviousCategoryPenalty: number;
	recentCategoryPenalty: number;
	samePreviousSeedPenalty: number;
	samePreviousProviderPenalty: number;
	order: number;
}

type SequencingContextItem = ReferenceFeedContextItem | ReferenceCandidate;

const samePreviousCategoryPenalty = 1_000;
const recentCategoryUnitPenalty = 100;
const samePreviousSeedPenalty = 25;
const samePreviousProviderPenalty = 5;
const recentCategoryWindowSize = 12;

function compareScores(left: CandidateScore, right: CandidateScore): number {
	return (
		left.rank - right.rank ||
		left.samePreviousCategoryPenalty - right.samePreviousCategoryPenalty ||
		left.recentCategoryPenalty - right.recentCategoryPenalty ||
		left.samePreviousSeedPenalty - right.samePreviousSeedPenalty ||
		left.samePreviousProviderPenalty - right.samePreviousProviderPenalty ||
		left.order - right.order
	);
}

function isReferenceCandidate(reference: SequencingContextItem): reference is ReferenceCandidate {
	return 'reference' in reference;
}

function getCategory(reference: SequencingContextItem): DrawingReference['category'] {
	return isReferenceCandidate(reference) ? reference.reference.category : reference.category;
}

function getProviderId(reference: SequencingContextItem): ReferenceProviderId | undefined {
	return isReferenceCandidate(reference) ? reference.reference.provider.id : reference.providerId;
}

function getSeedId(reference: SequencingContextItem): string | undefined {
	return reference.seedId;
}

function countRecentCategoryUses(
	category: DrawingReference['category'],
	context: readonly SequencingContextItem[]
): number {
	return context
		.slice(-recentCategoryWindowSize)
		.reduce((count, reference) => count + (getCategory(reference) === category ? 1 : 0), 0);
}

function scoreCandidate(
	candidate: ReferenceCandidate,
	context: readonly SequencingContextItem[]
): CandidateScore {
	const previousReference = context.at(-1);
	const candidateCategory = candidate.reference.category;
	const candidateProviderId = candidate.reference.provider.id;
	const previousProviderId = previousReference ? getProviderId(previousReference) : undefined;
	const previousSeedId = previousReference ? getSeedId(previousReference) : undefined;

	return {
		rank: candidate.rank,
		samePreviousCategoryPenalty:
			previousReference && getCategory(previousReference) === candidateCategory
				? samePreviousCategoryPenalty
				: 0,
		recentCategoryPenalty:
			countRecentCategoryUses(candidateCategory, context) * recentCategoryUnitPenalty,
		samePreviousSeedPenalty:
			candidate.seedId !== undefined && candidate.seedId === previousSeedId
				? samePreviousSeedPenalty
				: 0,
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
