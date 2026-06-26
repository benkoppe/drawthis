import type {
	ReferencePracticeFocus,
	ReferenceSceneType,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from './taxonomy';

export type ReferenceProviderId = 'local' | (string & {});

export type ReferenceOrientation = 'any' | 'landscape' | 'portrait' | 'square';

export interface ReferenceTaxonomy {
	primarySubject: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	secondarySubjects?: readonly ReferenceSubjectId[];
	sceneTypes?: readonly ReferenceSceneType[];
}

export interface ReferenceTrainingMetadata {
	focuses?: readonly ReferencePracticeFocus[];
	complexity?: ReferenceVisualComplexity;
}

export interface ReferenceSelectionMetadata {
	seedId?: string;
}

export interface DrawingReference {
	id: string;
	provider: {
		id: ReferenceProviderId;
		name: string;
		referenceId: string;
	};
	title: string;
	taxonomy: ReferenceTaxonomy;
	training?: ReferenceTrainingMetadata;
	selection?: ReferenceSelectionMetadata;
	image: {
		url: string;
		alt: string;
		width?: number;
		height?: number;
	};
	attribution: {
		label: string;
		sourceName: string;
		sourceUrl: string;
		creatorName?: string;
		creatorUrl?: string;
		licenseName?: string;
		licenseUrl?: string;
	};
}

export interface ReferenceFeedPreferences {
	enabledSubjects?: readonly ReferenceSubjectId[];
	enabledTopics?: readonly ReferenceTopicId[];
}

export interface ReferenceFeedContextItem {
	id: string;
	primarySubject: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	providerId?: ReferenceProviderId;
	seedId?: string;
	sceneTypes?: readonly ReferenceSceneType[];
	practiceFocuses?: readonly ReferencePracticeFocus[];
}

export interface ReferenceFeedRequest {
	count?: number;
	currentReferenceId?: string;
	recentReferenceIds?: readonly string[];
	recentReferences?: readonly ReferenceFeedContextItem[];
	precedingReferences?: readonly ReferenceFeedContextItem[];
	preferences?: ReferenceFeedPreferences;
}

export interface ReferenceFeedResponse {
	references: DrawingReference[];
}
