import type { DrawingReference } from './types';
import {
	getReferenceSubjectSelectionKey,
	getReferenceTopicSelectionKey,
	isReferenceInCategorySelection,
	normalizeReferenceSubjects,
	normalizeReferenceTopics,
	type ReferenceSubjectId,
	type ReferenceTopicId
} from './taxonomy';

export interface ReferenceCategorySelectionSnapshot {
	subjects: ReferenceSubjectId[];
	topics: ReferenceTopicId[];
	key: string;
}

export function getReferenceCategorySelectionKey(
	subjects: readonly ReferenceSubjectId[],
	topics: readonly ReferenceTopicId[]
): string {
	return `${getReferenceSubjectSelectionKey(subjects)}:${getReferenceTopicSelectionKey(topics, subjects)}`;
}

export function createReferenceCategorySelectionSnapshot(
	subjects: readonly ReferenceSubjectId[],
	topics: readonly ReferenceTopicId[]
): ReferenceCategorySelectionSnapshot {
	const normalizedSubjects = normalizeReferenceSubjects(subjects);
	const normalizedTopics = normalizeReferenceTopics(topics, normalizedSubjects);

	return {
		subjects: normalizedSubjects,
		topics: normalizedTopics,
		key: getReferenceCategorySelectionKey(normalizedSubjects, normalizedTopics)
	};
}

export function isReferenceInCategorySelectionSnapshot(
	reference: DrawingReference,
	selection: ReferenceCategorySelectionSnapshot
): boolean {
	return isReferenceInCategorySelection(reference, selection.subjects, selection.topics);
}

export function filterReferencesByCategorySelectionSnapshot(
	references: readonly DrawingReference[],
	selection: ReferenceCategorySelectionSnapshot
): DrawingReference[] {
	return references.filter((reference) =>
		isReferenceInCategorySelectionSnapshot(reference, selection)
	);
}
