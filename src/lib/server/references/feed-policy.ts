import type {
	ReferenceOrientation,
	ReferencePracticeFocus,
	ReferenceProviderId,
	ReferenceSceneType,
	ReferenceSubjectId,
	ReferenceTopicId,
	ReferenceVisualComplexity
} from '$lib/references';

export interface ReferenceSearchSeed {
	id: string;
	label: string;
	query: string;
	primarySubject: ReferenceSubjectId;
	topic?: ReferenceTopicId;
	secondarySubjects?: readonly ReferenceSubjectId[];
	sceneTypes?: readonly ReferenceSceneType[];
	practiceFocuses?: readonly ReferencePracticeFocus[];
	complexity?: ReferenceVisualComplexity;
	weight?: number;
	orientation?: ReferenceOrientation;
}

export interface ReferenceProviderPaginationPolicy {
	initialCursorPageMin: number;
	initialCursorPageMax: number;
}

export interface ReferenceFeedPolicy {
	seeds: readonly ReferenceSearchSeed[];
	providerWeights?: Readonly<Partial<Record<ReferenceProviderId, number>>>;
	providerPagination?: Readonly<
		Partial<Record<ReferenceProviderId, ReferenceProviderPaginationPolicy>>
	>;
}

const defaultSeeds = [
	{
		id: 'people-standing-figure',
		label: 'Standing figure',
		query: 'standing figure pose reference photo',
		primarySubject: 'people',
		topic: 'full-figure',
		practiceFocuses: ['proportion', 'gesture', 'anatomy'],
		complexity: 'moderate',
		orientation: 'portrait'
	},
	{
		id: 'people-seated-pose',
		label: 'Seated figure',
		query: 'seated figure pose reference photo',
		primarySubject: 'people',
		topic: 'full-figure',
		practiceFocuses: ['proportion', 'construction'],
		complexity: 'moderate'
	},
	{
		id: 'people-action-gesture',
		label: 'Action gesture',
		query: 'person action pose gesture reference',
		primarySubject: 'people',
		topic: 'gesture-action',
		practiceFocuses: ['gesture', 'proportion'],
		complexity: 'simple'
	},
	{
		id: 'people-hands',
		label: 'Hands',
		query: 'hands reference photo',
		primarySubject: 'people',
		topic: 'hands-feet',
		sceneTypes: ['close-up'],
		practiceFocuses: ['construction', 'anatomy', 'shape'],
		complexity: 'moderate'
	},
	{
		id: 'people-face-expression',
		label: 'Face expression',
		query: 'face expression portrait reference photo',
		primarySubject: 'people',
		topic: 'expression',
		sceneTypes: ['close-up'],
		practiceFocuses: ['proportion', 'anatomy', 'value'],
		complexity: 'moderate',
		orientation: 'portrait'
	},
	{
		id: 'people-clothing-folds',
		label: 'Clothing folds',
		query: 'person wearing jacket clothing folds reference',
		primarySubject: 'people',
		topic: 'clothing-drapery',
		practiceFocuses: ['shape', 'material', 'texture'],
		complexity: 'complex',
		orientation: 'portrait'
	},
	{
		id: 'animals-pet-pose',
		label: 'Pet pose',
		query: 'cat dog pet pose reference photo',
		primarySubject: 'animals',
		topic: 'pets',
		practiceFocuses: ['gesture', 'shape', 'proportion'],
		complexity: 'moderate'
	},
	{
		id: 'animals-bird',
		label: 'Bird',
		query: 'bird perched reference photo',
		primarySubject: 'animals',
		topic: 'birds',
		practiceFocuses: ['shape', 'proportion', 'texture'],
		complexity: 'moderate'
	},
	{
		id: 'animals-wildlife-head',
		label: 'Animal head',
		query: 'animal head close up reference photo',
		primarySubject: 'animals',
		topic: 'animal-heads',
		sceneTypes: ['close-up'],
		practiceFocuses: ['construction', 'texture', 'value'],
		complexity: 'moderate'
	},
	{
		id: 'animals-motion',
		label: 'Animal motion',
		query: 'animal running motion reference photo',
		primarySubject: 'animals',
		topic: 'motion-poses',
		practiceFocuses: ['gesture', 'proportion'],
		complexity: 'simple'
	},
	{
		id: 'objects-mug-bottle',
		label: 'Mug and bottle',
		query: 'mug bottle tabletop still life photo',
		primarySubject: 'objects',
		topic: 'still-life-groups',
		sceneTypes: ['still-life'],
		practiceFocuses: ['construction', 'shape', 'value'],
		complexity: 'moderate'
	},
	{
		id: 'objects-tools-table',
		label: 'Tools on table',
		query: 'tools on table reference photo',
		primarySubject: 'objects',
		topic: 'tools',
		sceneTypes: ['still-life', 'workplace'],
		practiceFocuses: ['construction', 'perspective', 'material'],
		complexity: 'complex'
	},
	{
		id: 'objects-food',
		label: 'Food study',
		query: 'ordinary food plate still life reference photo',
		primarySubject: 'objects',
		topic: 'food',
		sceneTypes: ['still-life', 'everyday-life'],
		practiceFocuses: ['shape', 'texture', 'value'],
		complexity: 'moderate'
	},
	{
		id: 'objects-fabric-clothes',
		label: 'Folded fabric',
		query: 'folded clothes fabric reference photo',
		primarySubject: 'objects',
		topic: 'fabric-clothing',
		sceneTypes: ['still-life'],
		practiceFocuses: ['material', 'texture', 'value'],
		complexity: 'moderate'
	},
	{
		id: 'objects-clutter',
		label: 'Household clutter',
		query: 'household objects clutter still life reference photo',
		primarySubject: 'objects',
		topic: 'clutter',
		sceneTypes: ['still-life', 'everyday-life'],
		practiceFocuses: ['composition', 'shape', 'negative-space'],
		complexity: 'dense'
	},
	{
		id: 'places-room-corner',
		label: 'Room corner',
		query: 'ordinary room corner interior reference photo',
		primarySubject: 'places',
		topic: 'rooms',
		sceneTypes: ['interior', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition', 'value'],
		complexity: 'complex',
		orientation: 'landscape'
	},
	{
		id: 'places-cluttered-desk',
		label: 'Cluttered desk',
		query: 'cluttered desk workspace reference photo',
		primarySubject: 'places',
		topic: 'kitchens-workspaces',
		secondarySubjects: ['objects'],
		sceneTypes: ['interior', 'workplace', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition', 'shape'],
		complexity: 'dense'
	},
	{
		id: 'places-kitchen-counter',
		label: 'Kitchen counter',
		query: 'ordinary kitchen counter reference photo',
		primarySubject: 'places',
		topic: 'kitchens-workspaces',
		secondarySubjects: ['objects'],
		sceneTypes: ['interior', 'everyday-life'],
		practiceFocuses: ['perspective', 'shape', 'value'],
		complexity: 'complex'
	},
	{
		id: 'places-waiting-room',
		label: 'Waiting room',
		query: 'waiting room interior reference photo',
		primarySubject: 'places',
		topic: 'public-interiors',
		sceneTypes: ['interior', 'public-space', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition'],
		complexity: 'complex',
		orientation: 'landscape'
	},
	{
		id: 'places-storefront-sidewalk',
		label: 'Storefront sidewalk',
		query: 'storefront sidewalk street reference photo',
		primarySubject: 'places',
		topic: 'storefronts',
		sceneTypes: ['street', 'public-space', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition', 'value'],
		complexity: 'complex',
		orientation: 'landscape'
	},
	{
		id: 'places-transit-stop',
		label: 'Transit stop',
		query: 'transit stop street reference photo',
		primarySubject: 'places',
		topic: 'transit-stops',
		secondarySubjects: ['people', 'vehicles-machines'],
		sceneTypes: ['street', 'public-space', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition'],
		complexity: 'complex',
		orientation: 'landscape'
	},
	{
		id: 'places-parking-lot',
		label: 'Parking lot',
		query: 'parking lot reference photo',
		primarySubject: 'places',
		topic: 'parking-lots',
		secondarySubjects: ['vehicles-machines'],
		sceneTypes: ['street', 'public-space', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition'],
		complexity: 'moderate',
		orientation: 'landscape'
	},
	{
		id: 'nature-potted-plant',
		label: 'Potted plant',
		query: 'potted plant reference photo',
		primarySubject: 'nature',
		topic: 'plants-flowers',
		sceneTypes: ['isolated-subject', 'interior'],
		practiceFocuses: ['shape', 'texture', 'negative-space'],
		complexity: 'moderate'
	},
	{
		id: 'nature-tree-branch',
		label: 'Tree branch',
		query: 'tree branch leaves reference photo',
		primarySubject: 'nature',
		topic: 'trees-branches',
		practiceFocuses: ['gesture', 'texture', 'shape'],
		complexity: 'complex'
	},
	{
		id: 'nature-rocks',
		label: 'Rocks',
		query: 'rocks ground texture reference photo',
		primarySubject: 'nature',
		topic: 'rocks-ground',
		sceneTypes: ['landscape'],
		practiceFocuses: ['texture', 'value', 'shape'],
		complexity: 'moderate'
	},
	{
		id: 'nature-garden-path',
		label: 'Garden path',
		query: 'garden path plants reference photo',
		primarySubject: 'nature',
		topic: 'gardens-parks',
		sceneTypes: ['landscape', 'everyday-life'],
		practiceFocuses: ['perspective', 'composition', 'texture'],
		complexity: 'complex',
		orientation: 'landscape'
	},
	{
		id: 'nature-landscape',
		label: 'Landscape',
		query: 'ordinary landscape reference photo',
		primarySubject: 'nature',
		topic: 'landscapes',
		sceneTypes: ['landscape'],
		practiceFocuses: ['composition', 'value', 'shape'],
		complexity: 'moderate',
		orientation: 'landscape'
	},
	{
		id: 'vehicles-car-street',
		label: 'Car on street',
		query: 'car parked on street reference photo',
		primarySubject: 'vehicles-machines',
		topic: 'cars-trucks',
		secondarySubjects: ['places'],
		sceneTypes: ['street', 'everyday-life'],
		practiceFocuses: ['perspective', 'construction', 'shape'],
		complexity: 'moderate',
		orientation: 'landscape'
	},
	{
		id: 'vehicles-bicycle',
		label: 'Bicycle',
		query: 'bicycle reference photo',
		primarySubject: 'vehicles-machines',
		topic: 'bikes-motorcycles',
		sceneTypes: ['isolated-subject', 'street'],
		practiceFocuses: ['construction', 'shape', 'negative-space'],
		complexity: 'complex'
	},
	{
		id: 'vehicles-train-bus',
		label: 'Transit vehicle',
		query: 'bus train transit vehicle reference photo',
		primarySubject: 'vehicles-machines',
		topic: 'buses-trains',
		sceneTypes: ['street', 'public-space'],
		practiceFocuses: ['perspective', 'construction'],
		complexity: 'complex',
		orientation: 'landscape'
	},
	{
		id: 'vehicles-machinery-detail',
		label: 'Mechanical detail',
		query: 'mechanical detail machinery reference photo',
		primarySubject: 'vehicles-machines',
		topic: 'mechanical-details',
		sceneTypes: ['close-up'],
		practiceFocuses: ['construction', 'material', 'texture'],
		complexity: 'dense'
	}
] as const satisfies readonly ReferenceSearchSeed[];

export const defaultReferenceFeedPolicy: ReferenceFeedPolicy = {
	providerPagination: {
		pexels: {
			initialCursorPageMin: 1,
			initialCursorPageMax: 10
		},
		openverse: {
			initialCursorPageMin: 1,
			initialCursorPageMax: 5
		}
	},
	seeds: defaultSeeds
};
