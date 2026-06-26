import {
	isReferencePracticeFocus,
	isReferenceSceneType,
	isReferenceSubject,
	isReferenceTopic,
	isReferenceTopicForSubject,
	isReferenceVisualComplexity,
	normalizeReferencePracticeFocuses,
	normalizeReferenceSceneTypes,
	normalizeReferenceSubjects,
	normalizeReferenceTopics,
	referenceSubjects,
	trimRecentReferenceIds,
	type ReferenceFeedContextItem,
	type ReferenceFeedPreferences,
	type ReferenceFeedRequest,
	type ReferenceSubjectId,
	type ReferenceTaxonomy,
	type ReferenceTopicId,
	type ReferenceTrainingMetadata
} from '$lib/references';
import { error } from '@sveltejs/kit';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseEnabledSubjects(value: unknown): ReferenceSubjectId[] {
	if (!Array.isArray(value)) {
		throw error(400, 'preferences.enabledSubjects must be an array');
	}

	if (value.length === 0) {
		throw error(400, 'preferences.enabledSubjects must include at least one subject');
	}

	const subjects: ReferenceSubjectId[] = [];

	for (const subject of value) {
		if (!isReferenceSubject(subject)) {
			throw error(400, 'subject is not supported');
		}

		if (!subjects.includes(subject)) {
			subjects.push(subject);
		}
	}

	return normalizeReferenceSubjects(subjects);
}

function parseEnabledTopics(
	value: unknown,
	enabledSubjects: readonly ReferenceSubjectId[]
): ReferenceTopicId[] {
	if (!Array.isArray(value)) {
		throw error(400, 'preferences.enabledTopics must be an array');
	}

	if (value.length === 0) {
		throw error(400, 'preferences.enabledTopics must include at least one topic');
	}

	const topics: ReferenceTopicId[] = [];

	for (const topic of value) {
		if (!isReferenceTopic(topic)) {
			throw error(400, 'topic is not supported');
		}

		if (!topics.includes(topic)) {
			topics.push(topic);
		}
	}

	const normalizedTopics = normalizeReferenceTopics(topics, enabledSubjects);

	if (normalizedTopics.length === 0) {
		throw error(
			400,
			'preferences.enabledTopics must include at least one topic for an enabled subject'
		);
	}

	return normalizedTopics;
}

function parseReferenceTaxonomy(value: unknown, fieldName: string): ReferenceTaxonomy {
	if (!isPlainObject(value)) {
		throw error(400, `${fieldName}.taxonomy must be an object`);
	}

	if (!isReferenceSubject(value.primarySubject)) {
		throw error(400, `${fieldName}.taxonomy.primarySubject is not supported`);
	}

	const taxonomy: ReferenceTaxonomy = { primarySubject: value.primarySubject };

	if (value.topic !== undefined) {
		if (!isReferenceTopic(value.topic)) {
			throw error(400, `${fieldName}.taxonomy.topic is not supported`);
		}

		if (!isReferenceTopicForSubject(value.topic, value.primarySubject)) {
			throw error(400, `${fieldName}.taxonomy.topic does not belong to primarySubject`);
		}

		taxonomy.topic = value.topic;
	}

	if (value.secondarySubjects !== undefined) {
		if (!Array.isArray(value.secondarySubjects)) {
			throw error(400, `${fieldName}.taxonomy.secondarySubjects must be an array`);
		}

		const secondarySubjects: ReferenceSubjectId[] = [];

		for (const subject of value.secondarySubjects) {
			if (!isReferenceSubject(subject)) {
				throw error(400, `${fieldName}.taxonomy.secondarySubjects contains unsupported subject`);
			}

			if (subject !== taxonomy.primarySubject && !secondarySubjects.includes(subject)) {
				secondarySubjects.push(subject);
			}
		}

		if (secondarySubjects.length > 0) {
			taxonomy.secondarySubjects = normalizeReferenceSubjects(secondarySubjects);
		}
	}

	return taxonomy;
}

function parseReferenceTraining(
	value: unknown,
	fieldName: string
): ReferenceTrainingMetadata | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (!isPlainObject(value)) {
		throw error(400, `${fieldName}.training must be an object`);
	}

	const training: ReferenceTrainingMetadata = {};

	if (value.sceneTypes !== undefined) {
		if (!Array.isArray(value.sceneTypes)) {
			throw error(400, `${fieldName}.training.sceneTypes must be an array`);
		}

		const sceneTypes = normalizeReferenceSceneTypes(value.sceneTypes.filter(isReferenceSceneType));

		if (sceneTypes !== undefined) {
			training.sceneTypes = sceneTypes;
		}
	}

	if (value.focuses !== undefined) {
		if (!Array.isArray(value.focuses)) {
			throw error(400, `${fieldName}.training.focuses must be an array`);
		}

		const focuses = normalizeReferencePracticeFocuses(
			value.focuses.filter(isReferencePracticeFocus)
		);

		if (focuses !== undefined) {
			training.focuses = focuses;
		}
	}

	if (value.complexity !== undefined) {
		if (!isReferenceVisualComplexity(value.complexity)) {
			throw error(400, `${fieldName}.training.complexity is not supported`);
		}

		training.complexity = value.complexity;
	}

	return Object.keys(training).length > 0 ? training : undefined;
}

function parseReferenceSelection(
	value: unknown,
	fieldName: string
): ReferenceFeedContextItem['selection'] {
	if (value === undefined) {
		return undefined;
	}

	if (!isPlainObject(value)) {
		throw error(400, `${fieldName}.selection must be an object`);
	}

	if (value.seedId === undefined) {
		return undefined;
	}

	if (typeof value.seedId !== 'string') {
		throw error(400, `${fieldName}.selection.seedId must be a string`);
	}

	return value.seedId.length > 0 ? { seedId: value.seedId } : undefined;
}

function parseReferenceFeedContextItems(
	value: unknown,
	fieldName: string
): ReferenceFeedContextItem[] {
	if (!Array.isArray(value)) {
		throw error(400, `${fieldName} must be an array`);
	}

	const references: ReferenceFeedContextItem[] = [];
	const referenceIds = new Set<string>();

	for (const reference of value) {
		if (!isPlainObject(reference)) {
			throw error(400, `${fieldName} entries must be objects`);
		}

		if (typeof reference.id !== 'string' || reference.id.length === 0) {
			throw error(400, `${fieldName}.id must be a non-empty string`);
		}

		if (reference.providerId !== undefined && typeof reference.providerId !== 'string') {
			throw error(400, `${fieldName}.providerId must be a string`);
		}

		if (referenceIds.has(reference.id)) {
			continue;
		}

		const parsedReference: ReferenceFeedContextItem = {
			id: reference.id,
			taxonomy: parseReferenceTaxonomy(reference.taxonomy, fieldName)
		};
		const selection = parseReferenceSelection(reference.selection, fieldName);
		const training = parseReferenceTraining(reference.training, fieldName);

		if (reference.providerId !== undefined && reference.providerId.length > 0) {
			parsedReference.providerId = reference.providerId;
		}

		if (selection !== undefined) {
			parsedReference.selection = selection;
		}

		if (training !== undefined) {
			parsedReference.training = training;
		}

		referenceIds.add(reference.id);
		references.push(parsedReference);
	}

	return references;
}

function parsePreferences(value: unknown): ReferenceFeedPreferences {
	if (!isPlainObject(value)) {
		throw error(400, 'preferences must be an object');
	}

	const preferences: ReferenceFeedPreferences = {};
	const enabledSubjects =
		value.enabledSubjects === undefined ? undefined : parseEnabledSubjects(value.enabledSubjects);

	if (enabledSubjects !== undefined) {
		preferences.enabledSubjects = enabledSubjects;
	}

	if (value.enabledTopics !== undefined) {
		preferences.enabledTopics = parseEnabledTopics(
			value.enabledTopics,
			enabledSubjects ?? referenceSubjects
		);
	}

	return preferences;
}

export function parseReferenceFeedRequest(body: unknown): ReferenceFeedRequest {
	if (!isPlainObject(body)) {
		return {};
	}

	const request: ReferenceFeedRequest = {};

	if (body.count !== undefined) {
		if (typeof body.count !== 'number' || !Number.isInteger(body.count)) {
			throw error(400, 'count must be an integer');
		}

		request.count = body.count;
	}

	if (body.currentReferenceId !== undefined) {
		if (typeof body.currentReferenceId !== 'string') {
			throw error(400, 'currentReferenceId must be a string');
		}

		if (body.currentReferenceId.length === 0) {
			throw error(400, 'currentReferenceId must not be empty');
		}

		request.currentReferenceId = body.currentReferenceId;
	}

	if (body.recentReferenceIds !== undefined) {
		if (
			!Array.isArray(body.recentReferenceIds) ||
			!body.recentReferenceIds.every((id) => typeof id === 'string')
		) {
			throw error(400, 'recentReferenceIds must be an array of strings');
		}

		request.recentReferenceIds = trimRecentReferenceIds(body.recentReferenceIds);
	}

	if (body.recentReferences !== undefined) {
		request.recentReferences = parseReferenceFeedContextItems(
			body.recentReferences,
			'recentReferences'
		);
	}

	if (body.precedingReferences !== undefined) {
		request.precedingReferences = parseReferenceFeedContextItems(
			body.precedingReferences,
			'precedingReferences'
		);
	}

	if (body.preferences !== undefined) {
		request.preferences = parsePreferences(body.preferences);
	}

	return request;
}
