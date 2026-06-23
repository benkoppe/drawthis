import type { Asset } from '$app/types';

export type ReferenceCategory = 'interior' | 'street' | 'figure-study' | 'still-life' | 'plant';

export interface DrawingReference {
	id: string;
	title: string;
	category: ReferenceCategory;
	imageUrl: Asset;
	alt: string;
	credit: string;
	sourceUrl: Asset;
}
