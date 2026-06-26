import { parseReferenceFeedContextItemLike } from './context';
import { maxRecentReferenceContexts, trimRecentReferenceIds } from './feed';
import type { ReferenceFeedContextItem } from './types';

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

function sanitizeReferenceContexts(
	referenceContexts: readonly unknown[]
): ReferenceFeedContextItem[] {
	return referenceContexts.flatMap((referenceContext) => {
		const parsedContext = parseReferenceFeedContextItemLike(referenceContext);

		return parsedContext === undefined ? [] : [parsedContext];
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
