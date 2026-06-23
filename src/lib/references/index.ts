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
export type {
	DrawingReference,
	ReferenceFeedRequest,
	ReferenceFeedResponse,
	ReferenceOrientation,
	ReferenceProviderId
} from './types';
