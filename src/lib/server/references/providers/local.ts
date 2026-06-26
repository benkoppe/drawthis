import {
	referenceSubjects,
	type DrawingReference,
	type ReferenceTaxonomy,
	type ReferenceTrainingMetadata
} from '$lib/references';
import type { ProviderSearchRequest, ProviderSearchResult, ReferenceProvider } from '../provider';
import {
	createReferenceSelectionFromProviderRequest,
	hasReferenceTrainingMetadata
} from '../reference-metadata';

const localProviderId = 'local';
const localProviderName = 'DrawThis local references';
const localSourceName = 'DrawThis';
const localMockCredit = 'DrawThis local mock reference';

interface LocalReferenceCatalogItem {
	id: string;
	title: string;
	taxonomy: ReferenceTaxonomy;
	training?: ReferenceTrainingMetadata;
	image: {
		url: string;
		alt: string;
	};
}

const localReferenceCatalog = [
	{
		id: 'room-interior',
		title: 'Room Interior',
		taxonomy: { primarySubject: 'places', topic: 'rooms' },
		training: {
			sceneTypes: ['interior', 'everyday-life'],
			focuses: ['perspective', 'composition'],
			complexity: 'complex'
		},
		image: {
			url: '/references/room-interior.svg',
			alt: 'Line drawing of a room corner with a table, chair, window, lamp, and framed picture.'
		}
	},
	{
		id: 'street-corner',
		title: 'Street Corner',
		taxonomy: { primarySubject: 'places', topic: 'streets-sidewalks' },
		training: {
			sceneTypes: ['street', 'public-space', 'everyday-life'],
			focuses: ['perspective', 'composition'],
			complexity: 'complex'
		},
		image: {
			url: '/references/street-corner.svg',
			alt: 'Line drawing of a city street corner with buildings, sidewalk, crosswalk, and a parked car.'
		}
	},
	{
		id: 'hand-study',
		title: 'Hand Study',
		taxonomy: { primarySubject: 'people', topic: 'hands-feet' },
		training: {
			sceneTypes: ['close-up'],
			focuses: ['construction', 'anatomy', 'shape'],
			complexity: 'moderate'
		},
		image: {
			url: '/references/hand-study.svg',
			alt: 'Line drawing of an open hand with separated fingers and palm construction lines.'
		}
	},
	{
		id: 'still-life',
		title: 'Still Life',
		taxonomy: { primarySubject: 'objects', topic: 'still-life-groups' },
		training: {
			sceneTypes: ['still-life'],
			focuses: ['construction', 'shape', 'value'],
			complexity: 'moderate'
		},
		image: {
			url: '/references/still-life.svg',
			alt: 'Line drawing of a mug, bottle, apple, folded cloth, and spoon on a table.'
		}
	},
	{
		id: 'plant-window',
		title: 'Plant By Window',
		taxonomy: { primarySubject: 'nature', topic: 'plants-flowers' },
		training: {
			sceneTypes: ['interior', 'isolated-subject'],
			focuses: ['shape', 'texture', 'negative-space'],
			complexity: 'moderate'
		},
		image: {
			url: '/references/plant-window.svg',
			alt: 'Line drawing of a potted plant on a low table in front of a window with curtains.'
		}
	},
	{
		id: 'animal-pose',
		title: 'Animal Pose',
		taxonomy: { primarySubject: 'animals', topic: 'pets' },
		training: {
			sceneTypes: ['isolated-subject'],
			focuses: ['gesture', 'shape', 'proportion'],
			complexity: 'moderate'
		},
		image: {
			url: '/references/animal-pose.svg',
			alt: 'Line drawing of a seated animal with simple gesture and construction shapes.'
		}
	},
	{
		id: 'bicycle-study',
		title: 'Bicycle Study',
		taxonomy: { primarySubject: 'vehicles-machines', topic: 'bikes-motorcycles' },
		training: {
			sceneTypes: ['isolated-subject'],
			focuses: ['construction', 'shape', 'negative-space'],
			complexity: 'complex'
		},
		image: {
			url: '/references/bicycle-study.svg',
			alt: 'Line drawing of a bicycle with two wheels, frame, handlebars, and seat.'
		}
	}
] satisfies readonly LocalReferenceCatalogItem[];

const localProviderSubjects = referenceSubjects.filter((subject) =>
	localReferenceCatalog.some((reference) => reference.taxonomy.primarySubject === subject)
);

function toDrawingReference(
	item: LocalReferenceCatalogItem,
	request: ProviderSearchRequest
): DrawingReference {
	const selection = createReferenceSelectionFromProviderRequest(request);

	return {
		id: `${localProviderId}:${item.id}`,
		provider: {
			id: localProviderId,
			name: localProviderName,
			referenceId: item.id
		},
		title: item.title,
		taxonomy: item.taxonomy,
		...(hasReferenceTrainingMetadata(item.training) ? { training: item.training } : {}),
		...(selection === undefined ? {} : { selection }),
		image: item.image,
		attribution: {
			label: localMockCredit,
			sourceName: localSourceName,
			sourceUrl: item.image.url
		}
	};
}

export const localReferenceProvider = {
	id: localProviderId,
	name: localProviderName,
	capabilities: {
		subjects: localProviderSubjects,
		supportsSearch: false,
		supportsPagination: false,
		supportsOrientation: false,
		attributionRequired: false
	},
	async search(request: ProviderSearchRequest): Promise<ProviderSearchResult> {
		const subjectMatches = request.primarySubject
			? localReferenceCatalog.filter(
					(reference) => reference.taxonomy.primarySubject === request.primarySubject
				)
			: localReferenceCatalog;
		const topicMatches = request.topic
			? subjectMatches.filter((reference) => reference.taxonomy.topic === request.topic)
			: subjectMatches;

		return {
			references: topicMatches
				.slice(0, request.count)
				.map((item) => toDrawingReference(item, request)),
			cachePolicy: {
				metadataTtlSeconds: 86_400,
				canCacheImageBytes: true
			}
		};
	}
} satisfies ReferenceProvider;

export const localReferenceCount = localReferenceCatalog.length;
