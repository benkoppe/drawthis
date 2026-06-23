import type {
	DrawingReference,
	ReferenceCategory,
	ReferenceOrientation,
	ReferenceProviderId
} from '$lib/references';

export interface ProviderCapabilities {
	categories: readonly ReferenceCategory[];
	supportsSearch: boolean;
	supportsPagination: boolean;
	supportsOrientation: boolean;
	attributionRequired: boolean;
}

export interface ProviderSearchRequest {
	count: number;
	query?: string;
	category?: ReferenceCategory;
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
