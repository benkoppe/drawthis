import {
	isReferencePracticeFocus,
	isReferenceSceneType,
	isReferenceSubject,
	isReferenceTopic,
	isReferenceTopicForSubject,
	isReferenceVisualComplexity,
	normalizeReferencePracticeFocuses,
	normalizeReferenceSceneTypes,
	normalizeReferenceSubjects
} from './taxonomy';
import { maxRecentReferenceContexts, trimRecentReferenceIds } from './feed';
import type {
	DrawingReference,
	ReferenceFeedContextItem,
	ReferenceTaxonomy,
	ReferenceTrainingMetadata
} from './types';

export const referenceHistoryCookieName = 'drawthis_recent_reference_ids_v3';
export const referenceContextHistoryCookieName = 'drawthis_recent_reference_contexts_v3';
export const referenceHistoryStorageKey = 'drawthis:recent-reference-ids:v3';
export const referenceContextHistoryStorageKey = 'drawthis:recent-reference-contexts:v3';

function sanitizeReferenceIds(referenceIds: readonly unknown[]): string[] {
	return referenceIds.flatMap((referenceId) => {
		if (typeof referenceId !== 'string') {
			return [];
		}

		const trimmed = referenceId.trim();
		return trimmed.length > 0 ? [trimmed] : [];
	});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeTaxonomy(value: unknown): ReferenceTaxonomy | undefined {
	if (!isRecord(value) || !isReferenceSubject(value.primarySubject)) {
		return undefined;
	}

	const taxonomy: ReferenceTaxonomy = { primarySubject: value.primarySubject };

	if (
		isReferenceTopic(value.topic) &&
		isReferenceTopicForSubject(value.topic, value.primarySubject)
	) {
		taxonomy.topic = value.topic;
	}

	if (Array.isArray(value.secondarySubjects)) {
		const secondarySubjects = value.secondarySubjects
			.filter(isReferenceSubject)
			.filter((subject) => {
				return subject !== taxonomy.primarySubject;
			});

		if (secondarySubjects.length > 0) {
			taxonomy.secondarySubjects = normalizeReferenceSubjects(secondarySubjects);
		}
	}

	return taxonomy;
}

function sanitizeTraining(value: unknown): ReferenceTrainingMetadata | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const training: ReferenceTrainingMetadata = {};

	if (Array.isArray(value.sceneTypes)) {
		const sceneTypes = normalizeReferenceSceneTypes(value.sceneTypes.filter(isReferenceSceneType));

		if (sceneTypes !== undefined) {
			training.sceneTypes = sceneTypes;
		}
	}

	if (Array.isArray(value.focuses)) {
		const focuses = normalizeReferencePracticeFocuses(
			value.focuses.filter(isReferencePracticeFocus)
		);

		if (focuses !== undefined) {
			training.focuses = focuses;
		}
	}

	if (isReferenceVisualComplexity(value.complexity)) {
		training.complexity = value.complexity;
	}

	return Object.keys(training).length > 0 ? training : undefined;
}

export function toReferenceFeedContextItem(reference: DrawingReference): ReferenceFeedContextItem {
	const context: ReferenceFeedContextItem = {
		id: reference.id,
		taxonomy: reference.taxonomy,
		providerId: reference.provider.id
	};

	const seedId = reference.selection?.seed?.id;

	if (seedId !== undefined) {
		context.selection = { seedId };
	}

	if (reference.training !== undefined) {
		context.training = reference.training;
	}

	return context;
}

function sanitizeReferenceContexts(
	referenceContexts: readonly unknown[]
): ReferenceFeedContextItem[] {
	return referenceContexts.flatMap((referenceContext) => {
		if (!isRecord(referenceContext)) {
			return [];
		}

		const id = typeof referenceContext.id === 'string' ? referenceContext.id.trim() : '';
		const taxonomy = sanitizeTaxonomy(referenceContext.taxonomy);

		if (id.length === 0 || taxonomy === undefined) {
			return [];
		}

		const sanitizedContext: ReferenceFeedContextItem = { id, taxonomy };

		if (typeof referenceContext.providerId === 'string' && referenceContext.providerId.length > 0) {
			sanitizedContext.providerId = referenceContext.providerId;
		}

		if (isRecord(referenceContext.selection)) {
			const seedId = referenceContext.selection.seedId;

			if (typeof seedId === 'string' && seedId.length > 0) {
				sanitizedContext.selection = { seedId };
			}
		}

		const training = sanitizeTraining(referenceContext.training);

		if (training !== undefined) {
			sanitizedContext.training = training;
		}

		return [sanitizedContext];
	});
}

export function mergeRecentReferenceIds(...sources: readonly (readonly unknown[])[]): string[] {
	const recentReferenceIds: string[] = [];

	for (const source of sources) {
		for (const referenceId of sanitizeReferenceIds(source)) {
			const existingIndex = recentReferenceIds.indexOf(referenceId);

			if (existingIndex !== -1) {
				recentReferenceIds.splice(existingIndex, 1);
			}

			recentReferenceIds.push(referenceId);
		}
	}

	return trimRecentReferenceIds(recentReferenceIds);
}

export function mergeRecentReferenceContexts(
	...sources: readonly (readonly unknown[])[]
): ReferenceFeedContextItem[] {
	const recentReferences: ReferenceFeedContextItem[] = [];

	for (const source of sources) {
		for (const referenceContext of sanitizeReferenceContexts(source)) {
			const existingIndex = recentReferences.findIndex(({ id }) => id === referenceContext.id);

			if (existingIndex !== -1) {
				recentReferences.splice(existingIndex, 1);
			}

			recentReferences.push(referenceContext);
		}
	}

	return recentReferences.slice(-maxRecentReferenceContexts);
}

export function parseRecentReferenceIds(value: string | null | undefined): string[] {
	if (value === null || value === undefined || value.length === 0) {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(value));

		return Array.isArray(parsed) ? mergeRecentReferenceIds(parsed) : [];
	} catch {
		return [];
	}
}

export function parseRecentReferenceContexts(
	value: string | null | undefined
): ReferenceFeedContextItem[] {
	if (value === null || value === undefined || value.length === 0) {
		return [];
	}

	try {
		const parsed: unknown = JSON.parse(decodeURIComponent(value));

		return Array.isArray(parsed) ? mergeRecentReferenceContexts(parsed) : [];
	} catch {
		return [];
	}
}

export function serializeRecentReferenceIds(referenceIds: readonly string[]): string {
	return encodeURIComponent(JSON.stringify(mergeRecentReferenceIds(referenceIds)));
}

export function serializeRecentReferenceContexts(
	referenceContexts: readonly ReferenceFeedContextItem[]
): string {
	return encodeURIComponent(JSON.stringify(mergeRecentReferenceContexts(referenceContexts)));
}
