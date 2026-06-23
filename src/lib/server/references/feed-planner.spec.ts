import type { ReferenceCategory, ReferenceFeedRequest } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { createReferenceFeedPlan } from './feed-planner';
import type { ReferenceFeedPolicy } from './feed-policy';
import type { ReferenceProvider } from './provider';

function makeProvider(
	overrides: Partial<ReferenceProvider> & {
		id: string;
		categories?: readonly ReferenceCategory[];
		supportsSearch?: boolean;
		supportsPagination?: boolean;
		supportsOrientation?: boolean;
	}
): ReferenceProvider {
	return {
		id: overrides.id,
		name: overrides.name ?? overrides.id,
		capabilities: overrides.capabilities ?? {
			categories: overrides.categories ?? ['interior'],
			supportsSearch: overrides.supportsSearch ?? false,
			supportsPagination: overrides.supportsPagination ?? false,
			supportsOrientation: overrides.supportsOrientation ?? false,
			attributionRequired: true
		},
		search: overrides.search ?? (async () => ({ references: [] })),
		recordEvent: overrides.recordEvent
	};
}

const testPolicy: ReferenceFeedPolicy = {
	categories: [
		{
			category: 'interior',
			weight: 1,
			subjectSeeds: [
				{ id: 'interior-desk', category: 'interior', query: 'cluttered desk' },
				{
					id: 'interior-kitchen',
					category: 'interior',
					query: 'ordinary kitchen',
					orientation: 'landscape'
				}
			]
		},
		{
			category: 'street',
			weight: 9,
			subjectSeeds: [{ id: 'street-stop', category: 'street', query: 'transit stop' }]
		}
	],
	providerWeights: {
		search: 9,
		local: 1
	}
};

describe('createReferenceFeedPlan', () => {
	it('allows every policy category when preferences are omitted', () => {
		const provider = makeProvider({
			id: 'search',
			categories: ['interior', 'street'],
			supportsSearch: true
		});
		const plan = createReferenceFeedPlan(
			{},
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(new Set(plan.searches.map((search) => search.category))).toEqual(
			new Set(['interior', 'street'])
		);
	});

	it('restricts planned categories to enabled category preferences', () => {
		const provider = makeProvider({
			id: 'search',
			categories: ['interior', 'street'],
			supportsSearch: true
		});
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['street'] } },
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches.map((search) => search.category)).toEqual(['street']);
	});

	it('passes generated queries only to search-capable providers', () => {
		const searchProvider = makeProvider({ id: 'search', supportsSearch: true });
		const localProvider = makeProvider({ id: 'local', supportsSearch: false });
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['interior'] } },
			{
				providers: [searchProvider, localProvider],
				policy: testPolicy,
				searchCount: 3,
				random: () => 0
			}
		);

		expect(plan.searches.find((search) => search.provider.id === 'search')?.request).toMatchObject({
			category: 'interior',
			count: 3,
			query: 'cluttered desk'
		});
		expect(plan.searches.find((search) => search.provider.id === 'local')?.request).toEqual({
			category: 'interior',
			count: 3
		});
	});

	it('passes seed orientation only to orientation-capable providers', () => {
		const provider = makeProvider({
			id: 'search',
			supportsSearch: true,
			supportsOrientation: true
		});
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['interior'] } },
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0.75 }
		);

		expect(plan.searches[0]?.request.orientation).toBe('landscape');
	});

	it('excludes providers that do not support enabled categories', () => {
		const unsupportedProvider = makeProvider({ id: 'unsupported', categories: ['still-life'] });
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['interior'] } },
			{ providers: [unsupportedProvider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches).toEqual([]);
	});

	it('preserves configured provider order when provider weights are omitted', () => {
		const pexelsProvider = makeProvider({ id: 'pexels', supportsSearch: true });
		const openverseProvider = makeProvider({ id: 'openverse', supportsSearch: true });
		const localProvider = makeProvider({ id: 'local', supportsSearch: false });
		const policyWithoutProviderWeights: ReferenceFeedPolicy = {
			categories: testPolicy.categories.slice(0, 1)
		};
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['interior'] } },
			{
				providers: [pexelsProvider, openverseProvider, localProvider],
				policy: policyWithoutProviderWeights,
				searchCount: 1,
				random: () => 0.99
			}
		);

		expect(plan.searches.slice(0, 3).map((search) => search.provider.id)).toEqual([
			'pexels',
			'openverse',
			'local'
		]);
	});

	it('dedupes equivalent requests for providers that do not support search', () => {
		const localProvider = makeProvider({ id: 'local', supportsSearch: false });
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['interior'] } },
			{ providers: [localProvider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches).toHaveLength(1);
		expect(plan.searches[0]?.request).toEqual({ count: 1, category: 'interior' });
	});

	it('adds a deterministic initial cursor for pagination-capable providers with pagination policy', () => {
		const provider = makeProvider({ id: 'pexels', supportsSearch: true, supportsPagination: true });
		const policy: ReferenceFeedPolicy = {
			categories: [
				{ category: 'interior', subjectSeeds: [testPolicy.categories[0].subjectSeeds[0]] }
			],
			providerPagination: {
				pexels: { initialCursorPageMin: 3, initialCursorPageMax: 7 }
			}
		};
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['interior'] } },
			{ providers: [provider], policy, searchCount: 1, random: () => 0.5 }
		);

		expect(plan.searches[0]?.request.cursor).toBe('5');
	});

	it('does not add an initial cursor for providers without pagination support or policy', () => {
		const paginationProviderWithoutPolicy = makeProvider({
			id: 'unconfigured',
			supportsSearch: true,
			supportsPagination: true
		});
		const providerWithoutPagination = makeProvider({ id: 'local', supportsPagination: false });
		const policy: ReferenceFeedPolicy = {
			categories: [
				{ category: 'interior', subjectSeeds: [testPolicy.categories[0].subjectSeeds[0]] }
			],
			providerPagination: {
				pexels: { initialCursorPageMin: 1, initialCursorPageMax: 10 }
			}
		};
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledCategories: ['interior'] } },
			{
				providers: [paginationProviderWithoutPolicy, providerWithoutPagination],
				policy,
				searchCount: 1,
				random: () => 0
			}
		);

		expect(plan.searches.map((search) => search.request.cursor)).toEqual([undefined, undefined]);
	});

	it('uses injected randomness for deterministic weighted ordering', () => {
		const provider = makeProvider({
			id: 'search',
			categories: ['interior', 'street'],
			supportsSearch: true
		});
		const plan = createReferenceFeedPlan(
			{},
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0.99 }
		);

		expect(plan.searches[0]?.category).toBe('street');
	});

	it('ignores query-like fields on the public feed request', () => {
		const provider = makeProvider({ id: 'search', supportsSearch: true });
		const request = {
			preferences: { enabledCategories: ['interior'] },
			query: 'user supplied query'
		} as unknown as ReferenceFeedRequest;
		const plan = createReferenceFeedPlan(request, {
			providers: [provider],
			policy: testPolicy,
			searchCount: 1,
			random: () => 0
		});

		expect(plan.searches[0]?.request.query).toBe('cluttered desk');
	});
});
