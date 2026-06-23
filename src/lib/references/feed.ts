export const defaultReferenceFeedCount = 1;
export const maxReferenceFeedCount = 10;
export const maxRecentReferenceIds = 50;

export function trimRecentReferenceIds(referenceIds: readonly string[]): string[] {
	return referenceIds.slice(-maxRecentReferenceIds);
}
