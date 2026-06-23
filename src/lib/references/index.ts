export { requestReferenceFeed, type RequestReferenceFeedOptions } from './api';
export {
	isReferenceCategory,
	referenceCategories,
	referenceCategoryLabels,
	type ReferenceCategory
} from './categories';
export {
	defaultReferenceFeedCount,
	maxRecentReferenceIds,
	maxReferenceFeedCount,
	trimRecentReferenceIds
} from './feed';
export {
	mergeRecentReferenceIds,
	parseRecentReferenceIds,
	referenceHistoryCookieName,
	referenceHistoryStorageKey,
	serializeRecentReferenceIds
} from './history';
export type {
	DrawingReference,
	ReferenceFeedPreferences,
	ReferenceFeedRequest,
	ReferenceFeedResponse,
	ReferenceOrientation,
	ReferenceProviderId
} from './types';
