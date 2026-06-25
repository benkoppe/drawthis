import {
	isReferenceCategory,
	normalizeReferenceCategories,
	trimRecentReferenceIds,
	type ReferenceCategory,
	type ReferenceFeedContextItem,
	type ReferenceFeedPreferences,
	type ReferenceFeedRequest
} from '$lib/references';
import { error } from '@sveltejs/kit';

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseEnabledCategories(value: unknown): ReferenceCategory[] {
	if (!Array.isArray(value)) {
		throw error(400, 'preferences.enabledCategories must be an array');
	}

	if (value.length === 0) {
		throw error(400, 'preferences.enabledCategories must include at least one category');
	}

	const categories: ReferenceCategory[] = [];

	for (const category of value) {
		if (!isReferenceCategory(category)) {
			throw error(400, 'category is not supported');
		}

		if (!categories.includes(category)) {
			categories.push(category);
		}
	}

	return normalizeReferenceCategories(categories);
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

		if (!isReferenceCategory(reference.category)) {
			throw error(400, `${fieldName}.category is not supported`);
		}

		if (reference.providerId !== undefined && typeof reference.providerId !== 'string') {
			throw error(400, `${fieldName}.providerId must be a string`);
		}

		if (reference.seedId !== undefined && typeof reference.seedId !== 'string') {
			throw error(400, `${fieldName}.seedId must be a string`);
		}

		if (referenceIds.has(reference.id)) {
			continue;
		}

		const parsedReference: ReferenceFeedContextItem = {
			id: reference.id,
			category: reference.category
		};

		if (reference.providerId !== undefined && reference.providerId.length > 0) {
			parsedReference.providerId = reference.providerId;
		}

		if (reference.seedId !== undefined && reference.seedId.length > 0) {
			parsedReference.seedId = reference.seedId;
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

	if (value.enabledCategories !== undefined) {
		preferences.enabledCategories = parseEnabledCategories(value.enabledCategories);
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
