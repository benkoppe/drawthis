import {
	isReferencePracticeFocus,
	isReferencePracticeMixMode,
	isReferenceSceneType,
	isReferenceSubject,
	isReferenceTopic,
	normalizeReferencePracticeFocuses,
	normalizeReferenceSceneTypes,
	normalizeReferenceSubjects,
	trimRecentReferenceIds,
	type ReferenceFeedContextItem,
	type ReferenceFeedPreferences,
	type ReferenceFeedRequest,
	type ReferenceSubjectId
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

		if (!isReferenceSubject(reference.primarySubject)) {
			throw error(400, `${fieldName}.primarySubject is not supported`);
		}

		if (reference.topic !== undefined && !isReferenceTopic(reference.topic)) {
			throw error(400, `${fieldName}.topic is not supported`);
		}

		if (reference.providerId !== undefined && typeof reference.providerId !== 'string') {
			throw error(400, `${fieldName}.providerId must be a string`);
		}

		if (reference.seedId !== undefined && typeof reference.seedId !== 'string') {
			throw error(400, `${fieldName}.seedId must be a string`);
		}

		if (reference.sceneTypes !== undefined && !Array.isArray(reference.sceneTypes)) {
			throw error(400, `${fieldName}.sceneTypes must be an array`);
		}

		if (reference.practiceFocuses !== undefined && !Array.isArray(reference.practiceFocuses)) {
			throw error(400, `${fieldName}.practiceFocuses must be an array`);
		}

		if (referenceIds.has(reference.id)) {
			continue;
		}

		const parsedReference: ReferenceFeedContextItem = {
			id: reference.id,
			primarySubject: reference.primarySubject
		};

		if (reference.topic !== undefined) {
			parsedReference.topic = reference.topic;
		}

		if (reference.providerId !== undefined && reference.providerId.length > 0) {
			parsedReference.providerId = reference.providerId;
		}

		if (reference.seedId !== undefined && reference.seedId.length > 0) {
			parsedReference.seedId = reference.seedId;
		}

		if (Array.isArray(reference.sceneTypes)) {
			const sceneTypes = normalizeReferenceSceneTypes(
				reference.sceneTypes.filter(isReferenceSceneType)
			);

			if (sceneTypes !== undefined) {
				parsedReference.sceneTypes = sceneTypes;
			}
		}

		if (Array.isArray(reference.practiceFocuses)) {
			const practiceFocuses = normalizeReferencePracticeFocuses(
				reference.practiceFocuses.filter(isReferencePracticeFocus)
			);

			if (practiceFocuses !== undefined) {
				parsedReference.practiceFocuses = practiceFocuses;
			}
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

	if (value.practiceMode !== undefined) {
		if (!isReferencePracticeMixMode(value.practiceMode)) {
			throw error(400, 'preferences.practiceMode is not supported');
		}

		preferences.practiceMode = value.practiceMode;
	}

	if (value.enabledSubjects !== undefined) {
		preferences.enabledSubjects = parseEnabledSubjects(value.enabledSubjects);
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
