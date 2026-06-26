export const defaultReferenceFeedCount = 1;
export const initialReferenceFeedCount = 4;
export const maxReferenceFeedCount = 10;
export const providerReferenceSearchPageSize = 10;
export const referenceQueueTargetSize = 10;
export const referenceQueueLowWatermark = 5;
export const imagePreloadAheadCount = 4;
export const maxRecentReferenceIds = 50;
export const maxRecentReferenceContexts = 8;

export function trimRecentReferenceIds(referenceIds: readonly string[]): string[] {
	return referenceIds.slice(-maxRecentReferenceIds);
}
