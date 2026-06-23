import type { ReferenceCategory, ReferenceOrientation, ReferenceProviderId } from '$lib/references';

export interface ReferenceSubjectSeed {
	id: string;
	category: ReferenceCategory;
	query: string;
	weight?: number;
	orientation?: ReferenceOrientation;
}

export interface ReferenceCategoryPolicy {
	category: ReferenceCategory;
	weight?: number;
	subjectSeeds: readonly ReferenceSubjectSeed[];
}

export interface ReferenceProviderPaginationPolicy {
	initialCursorPageMin: number;
	initialCursorPageMax: number;
}

export interface ReferenceFeedPolicy {
	categories: readonly ReferenceCategoryPolicy[];
	providerWeights?: Readonly<Partial<Record<ReferenceProviderId, number>>>;
	providerPagination?: Readonly<
		Partial<Record<ReferenceProviderId, ReferenceProviderPaginationPolicy>>
	>;
}

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
	categories: [
		{
			category: 'interior',
			subjectSeeds: [
				{ id: 'interior-cluttered-desk', category: 'interior', query: 'cluttered desk' },
				{ id: 'interior-kitchen-counter', category: 'interior', query: 'ordinary kitchen counter' },
				{ id: 'interior-small-bedroom', category: 'interior', query: 'small bedroom' },
				{ id: 'interior-waiting-room', category: 'interior', query: 'waiting room interior' }
			]
		},
		{
			category: 'street',
			subjectSeeds: [
				{ id: 'street-storefront-sidewalk', category: 'street', query: 'storefront sidewalk' },
				{ id: 'street-parking-lot', category: 'street', query: 'parking lot' },
				{ id: 'street-transit-stop', category: 'street', query: 'transit stop' },
				{ id: 'street-side-street', category: 'street', query: 'side street' }
			]
		},
		{
			category: 'figure-study',
			subjectSeeds: [
				{
					id: 'figure-standing-pose',
					category: 'figure-study',
					query: 'standing figure pose',
					orientation: 'portrait'
				},
				{
					id: 'figure-seated-pose',
					category: 'figure-study',
					query: 'seated figure pose'
				},
				{ id: 'figure-hands', category: 'figure-study', query: 'hands reference' },
				{
					id: 'figure-face-expression',
					category: 'figure-study',
					query: 'face expression reference'
				}
			]
		},
		{
			category: 'still-life',
			subjectSeeds: [
				{ id: 'still-life-mug-bottle', category: 'still-life', query: 'mug and bottle still life' },
				{ id: 'still-life-tools-table', category: 'still-life', query: 'tools on table' },
				{ id: 'still-life-folded-clothes', category: 'still-life', query: 'folded clothes' },
				{
					id: 'still-life-household-objects',
					category: 'still-life',
					query: 'household objects still life'
				}
			]
		},
		{
			category: 'plant',
			subjectSeeds: [
				{ id: 'plant-potted-plant', category: 'plant', query: 'potted plant' },
				{ id: 'plant-garden-leaves', category: 'plant', query: 'garden leaves' },
				{ id: 'plant-tree-branch', category: 'plant', query: 'tree branch' },
				{ id: 'plant-flowers-vase', category: 'plant', query: 'flowers in vase' }
			]
		}
	]
};
