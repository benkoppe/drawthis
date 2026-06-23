import type { ReferenceCategory } from './categories';

export type ReferenceProviderId = 'local' | (string & {});

export type ReferenceOrientation = 'any' | 'landscape' | 'portrait' | 'square';

export interface DrawingReference {
	id: string;
	provider: {
		id: ReferenceProviderId;
		name: string;
		referenceId: string;
	};
	title: string;
	category: ReferenceCategory;
	image: {
		url: string;
		alt: string;
		width?: number;
		height?: number;
	};
	attribution: {
		label: string;
		sourceUrl: string;
		creatorName?: string;
		creatorUrl?: string;
		licenseName?: string;
		licenseUrl?: string;
	};
}

export interface ReferenceFeedPreferences {
	enabledCategories?: readonly ReferenceCategory[];
}

export interface ReferenceFeedRequest {
	count?: number;
	recentReferenceIds?: readonly string[];
	preferences?: ReferenceFeedPreferences;
}

export interface ReferenceFeedResponse {
	references: DrawingReference[];
}
