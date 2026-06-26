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
import type {
	DrawingReference,
	ReferenceFeedContextItem,
	ReferenceTaxonomy,
	ReferenceTrainingMetadata
} from './types';

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseReferenceTaxonomyLike(value: unknown): ReferenceTaxonomy | undefined {
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
		const secondarySubjects = normalizeReferenceSubjects(
			value.secondarySubjects
				.filter(isReferenceSubject)
				.filter((subject) => subject !== taxonomy.primarySubject)
		);

		if (secondarySubjects.length > 0) {
			taxonomy.secondarySubjects = secondarySubjects;
		}
	}

	return taxonomy;
}

export function parseReferenceTrainingMetadataLike(
	value: unknown
): ReferenceTrainingMetadata | undefined {
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

export function parseReferenceFeedContextItemLike(
	value: unknown
): ReferenceFeedContextItem | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	const id = typeof value.id === 'string' ? value.id.trim() : '';
	const taxonomy = parseReferenceTaxonomyLike(value.taxonomy);

	if (id.length === 0 || taxonomy === undefined) {
		return undefined;
	}

	const context: ReferenceFeedContextItem = { id, taxonomy };

	if (typeof value.providerId === 'string' && value.providerId.length > 0) {
		context.providerId = value.providerId;
	}

	if (isRecord(value.selection)) {
		const seedId = value.selection.seedId;

		if (typeof seedId === 'string' && seedId.length > 0) {
			context.selection = { seedId };
		}
	}

	const training = parseReferenceTrainingMetadataLike(value.training);

	if (training !== undefined) {
		context.training = training;
	}

	return context;
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

export function compactReferenceFeedContextItem(
	context: ReferenceFeedContextItem
): ReferenceFeedContextItem {
	const compactContext: ReferenceFeedContextItem = {
		id: context.id,
		taxonomy: {
			primarySubject: context.taxonomy.primarySubject
		}
	};

	if (context.taxonomy.topic !== undefined) {
		compactContext.taxonomy.topic = context.taxonomy.topic;
	}

	if (context.providerId !== undefined) {
		compactContext.providerId = context.providerId;
	}

	if (context.selection?.seedId !== undefined) {
		compactContext.selection = { seedId: context.selection.seedId };
	}

	if (context.training !== undefined) {
		compactContext.training = context.training;
	}

	return compactContext;
}
