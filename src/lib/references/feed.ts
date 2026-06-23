export const defaultReferenceFeedCount = 1;
export const initialReferenceFeedCount = 4;
export const maxReferenceFeedCount = 10;
export const providerReferenceSearchPageSize = 10;
export const referenceQueueTargetSize = 6;
export const referenceQueueLowWatermark = 2;
export const imagePreloadAheadCount = 2;
export const maxRecentReferenceIds = 50;

export function trimRecentReferenceIds(referenceIds: readonly string[]): string[] {
	return referenceIds.slice(-maxRecentReferenceIds);
}
