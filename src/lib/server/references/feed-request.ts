import {
	isReferenceCategory,
	trimRecentReferenceIds,
	type ReferenceCategory,
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

	return categories;
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

	if (body.recentReferenceIds !== undefined) {
		if (
			!Array.isArray(body.recentReferenceIds) ||
			!body.recentReferenceIds.every((id) => typeof id === 'string')
		) {
			throw error(400, 'recentReferenceIds must be an array of strings');
		}

		request.recentReferenceIds = trimRecentReferenceIds(body.recentReferenceIds);
	}

	if (body.preferences !== undefined) {
		request.preferences = parsePreferences(body.preferences);
	}

	return request;
}
