import { trimRecentReferenceIds } from './feed';

export const referenceHistoryCookieName = 'drawthis_recent_references';
export const referenceHistoryStorageKey = 'drawthis:recent-references';

function sanitizeReferenceIds(referenceIds: readonly unknown[]): string[] {
	return referenceIds.flatMap((referenceId) => {
		if (typeof referenceId !== 'string') {
			return [];
		}

		const trimmed = referenceId.trim();
		return trimmed.length > 0 ? [trimmed] : [];
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

export function serializeRecentReferenceIds(referenceIds: readonly string[]): string {
	return encodeURIComponent(JSON.stringify(mergeRecentReferenceIds(referenceIds)));
}
