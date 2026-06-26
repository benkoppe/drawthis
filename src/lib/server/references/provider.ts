import type {
	DrawingReference,
	ReferenceOrientation,
	ReferencePracticeFocus,
	ReferenceProviderId,
	ReferenceSceneType,
	ReferenceSeedMetadata,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from '$lib/references';

export interface ProviderCapabilities {
	subjects: readonly ReferenceSubjectId[];
	supportsSearch: boolean;
	supportsPagination: boolean;
	supportsOrientation: boolean;
	attributionRequired: boolean;
}

export interface ProviderSearchRequest {
	count: number;
	query?: string;
	primarySubject?: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	secondarySubjects?: readonly ReferenceSubjectId[];
	sceneTypes?: readonly ReferenceSceneType[];
	practiceFocuses?: readonly ReferencePracticeFocus[];
	complexity?: ReferenceVisualComplexity;
	seed?: ReferenceSeedMetadata;
	orientation?: ReferenceOrientation;
	cursor?: string;
}

export interface ProviderCachePolicy {
	metadataTtlSeconds: number;
	canCacheImageBytes: boolean;
}

export interface ProviderSearchResult {
	references: DrawingReference[];
	nextCursor?: string;
	cachePolicy?: ProviderCachePolicy;
}

export type ProviderReferenceEventType = 'view' | 'open-source' | 'download';

export interface ProviderReferenceEvent {
	type: ProviderReferenceEventType;
	reference: DrawingReference;
}

export interface ReferenceProvider {
	id: ReferenceProviderId;
	name: string;
	capabilities: ProviderCapabilities;
	search(request: ProviderSearchRequest): Promise<ProviderSearchResult>;
	recordEvent?(event: ProviderReferenceEvent): Promise<void>;
}
