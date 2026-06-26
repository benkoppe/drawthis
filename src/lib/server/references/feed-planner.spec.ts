import type { ReferenceFeedRequest, ReferenceSubjectId } from '$lib/references';
import { describe, expect, it } from 'vitest';
import { createReferenceFeedPlan } from './feed-planner';
import type { ReferenceFeedPolicy } from './feed-policy';
import type { ReferenceProvider } from './provider';

function makeProvider(
	overrides: Partial<ReferenceProvider> & {
		id: string;
		subjects?: readonly ReferenceSubjectId[];
		supportsSearch?: boolean;
		supportsPagination?: boolean;
		supportsOrientation?: boolean;
	}
): ReferenceProvider {
	return {
		id: overrides.id,
		name: overrides.name ?? overrides.id,
		capabilities: overrides.capabilities ?? {
			subjects: overrides.subjects ?? ['objects'],
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
	seeds: [
		{
			id: 'objects-desk',
			label: 'Desk objects',
			primarySubject: 'objects',
			topic: 'household-objects',
			query: 'cluttered desk objects'
		},
		{
			id: 'places-kitchen',
			label: 'Kitchen',
			primarySubject: 'places',
			topic: 'kitchens-workspaces',
			query: 'ordinary kitchen',
			orientation: 'landscape'
		},
		{
			id: 'people-gesture',
			label: 'Gesture',
			primarySubject: 'people',
			topic: 'gesture-action',
			query: 'gesture pose'
		}
	],
	providerWeights: {
		search: 9,
		local: 1
	}
};

describe('createReferenceFeedPlan', () => {
	it('allows every policy subject when preferences are omitted', () => {
		const provider = makeProvider({
			id: 'search',
			subjects: ['objects', 'places', 'people'],
			supportsSearch: true
		});
		const plan = createReferenceFeedPlan(
			{},
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(new Set(plan.searches.map((search) => search.primarySubject))).toEqual(
			new Set(['objects', 'places', 'people'])
		);
	});

	it('restricts planned subjects to enabled subject preferences', () => {
		const provider = makeProvider({
			id: 'search',
			subjects: ['objects', 'places'],
			supportsSearch: true
		});
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['places'] } },
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches.map((search) => search.primarySubject)).toEqual(['places']);
	});

	it('passes generated queries only to search-capable providers', () => {
		const searchProvider = makeProvider({ id: 'search', supportsSearch: true });
		const localProvider = makeProvider({ id: 'local', supportsSearch: false });
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['objects'] } },
			{
				providers: [searchProvider, localProvider],
				policy: testPolicy,
				searchCount: 3,
				random: () => 0
			}
		);

		expect(plan.searches.find((search) => search.provider.id === 'search')?.request).toMatchObject({
			primarySubject: 'objects',
			count: 3,
			query: 'cluttered desk objects',
			seed: {
				id: 'objects-desk',
				label: 'Desk objects',
				query: 'cluttered desk objects'
			}
		});
		expect(plan.searches.find((search) => search.provider.id === 'local')?.request).toMatchObject({
			primarySubject: 'objects',
			count: 3,
			seed: {
				id: 'objects-desk',
				label: 'Desk objects',
				query: 'cluttered desk objects'
			}
		});
		expect(
			plan.searches.find((search) => search.provider.id === 'local')?.request.query
		).toBeUndefined();
	});

	it('passes seed orientation only to orientation-capable providers', () => {
		const provider = makeProvider({
			id: 'search',
			subjects: ['places'],
			supportsSearch: true,
			supportsOrientation: true
		});
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['places'] } },
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches[0]?.request.orientation).toBe('landscape');
	});

	it('excludes providers that do not support enabled subjects', () => {
		const unsupportedProvider = makeProvider({ id: 'unsupported', subjects: ['people'] });
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['places'] } },
			{ providers: [unsupportedProvider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches).toEqual([]);
	});

	it('preserves configured provider order when provider weights are omitted', () => {
		const pexelsProvider = makeProvider({ id: 'pexels', supportsSearch: true });
		const openverseProvider = makeProvider({ id: 'openverse', supportsSearch: true });
		const localProvider = makeProvider({ id: 'local', supportsSearch: false });
		const policyWithoutProviderWeights: ReferenceFeedPolicy = {
			seeds: testPolicy.seeds.slice(0, 1)
		};
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['objects'] } },
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
		const policy: ReferenceFeedPolicy = {
			seeds: [
				...testPolicy.seeds.slice(0, 1),
				{ ...testPolicy.seeds[0], id: 'objects-desk-copy', query: 'different query' }
			]
		};
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['objects'] } },
			{ providers: [localProvider], policy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches).toHaveLength(1);
		expect(plan.searches[0]?.request).toMatchObject({
			count: 1,
			primarySubject: 'objects'
		});
	});

	it('adds a deterministic initial cursor for pagination-capable providers with pagination policy', () => {
		const provider = makeProvider({ id: 'pexels', supportsSearch: true, supportsPagination: true });
		const policy: ReferenceFeedPolicy = {
			seeds: [testPolicy.seeds[0]],
			providerPagination: {
				pexels: { initialCursorPageMin: 3, initialCursorPageMax: 7 }
			}
		};
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['objects'] } },
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
			seeds: [testPolicy.seeds[0]],
			providerPagination: {
				pexels: { initialCursorPageMin: 1, initialCursorPageMax: 10 }
			}
		};
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['objects'] } },
			{
				providers: [paginationProviderWithoutPolicy, providerWithoutPagination],
				policy,
				searchCount: 1,
				random: () => 0
			}
		);

		expect(plan.searches.map((search) => search.request.cursor)).toEqual([undefined, undefined]);
	});

	it('uses injected randomness for deterministic weighted subject ordering', () => {
		const provider = makeProvider({
			id: 'search',
			subjects: ['objects', 'places'],
			supportsSearch: true
		});
		const weightedPolicy: ReferenceFeedPolicy = {
			seeds: [testPolicy.seeds[0], { ...testPolicy.seeds[1], weight: 9 }]
		};
		const plan = createReferenceFeedPlan(
			{},
			{ providers: [provider], policy: weightedPolicy, searchCount: 1, random: () => 0.99 }
		);

		expect(plan.searches[0]?.primarySubject).toBe('places');
	});

	it('restricts planned searches to enabled subcategories', () => {
		const provider = makeProvider({ id: 'search', subjects: ['objects'], supportsSearch: true });
		const plan = createReferenceFeedPlan(
			{ preferences: { enabledSubjects: ['objects'], enabledTopics: ['household-objects'] } },
			{ providers: [provider], policy: testPolicy, searchCount: 1, random: () => 0 }
		);

		expect(plan.searches.map((search) => search.seed.id)).toEqual(['objects-desk']);
	});

	it('ignores query-like fields on the public feed request', () => {
		const provider = makeProvider({ id: 'search', supportsSearch: true });
		const request = {
			preferences: { enabledSubjects: ['objects'] },
			query: 'user supplied query'
		} as unknown as ReferenceFeedRequest;
		const plan = createReferenceFeedPlan(request, {
			providers: [provider],
			policy: testPolicy,
			searchCount: 1,
			random: () => 0
		});

		expect(plan.searches[0]?.request.query).toBe('cluttered desk objects');
	});
});
