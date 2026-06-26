import type { ReferenceProviderId } from '$lib/references';
import { defaultReferenceSearchSeeds } from './reference-seeds';
import type { ReferenceSearchSeed } from './reference-seed';

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
	maxProviderSearchAttempts?: number;
}

export const defaultReferenceFeedPolicy: ReferenceFeedPolicy = {
	maxProviderSearchAttempts: 24,
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
	seeds: defaultReferenceSearchSeeds
};
